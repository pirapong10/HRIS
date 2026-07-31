=== SPRINT: Shift CRUD Backend Endpoints ===

Read CONTEXT.md first.
PLANNING MODE — show plan before any code changes.

ShiftManagement.jsx is already using api correctly.
Only backend is missing. No frontend changes needed.

---

## WHAT'S MISSING

shift.routes.ts only has:
  GET  /shifts/swaps
  POST /shifts/swaps
  PUT  /shifts/swaps/:id

Missing:
  GET    /api/shifts          ← frontend calls this on mount (404 now)
  POST   /api/shifts          ← save() creates new shift
  PUT    /api/shifts/:id      ← save() updates existing shift
  DELETE /api/shifts/:id      ← not in frontend yet but needed

Also missing from ShiftSwap:
  - No scope filter (HR_MANAGER should only see swaps for their dept)
  - No include: { reqEmployee, targetEmployee } with dept info for frontend display
  - No pagination

---

## STEP 1: Add Shift CRUD to shift.controller.ts

Show current full shift.controller.ts first (already have it — confirm no changes).

Add these functions:

```typescript
export const getShifts = async (req: AuthRequest, res: Response) => {
  try {
    const shifts = await prisma.shift.findMany({
      include: {
        _count: { select: { employees: true } }
      },
      orderBy: { name: 'asc' }
    });
    // Parse days JSON string for each shift
    const result = shifts.map(s => ({
      ...s,
      days: typeof s.days === 'string' ? JSON.parse(s.days) : s.days,
      employeeCount: s._count.employees
    }));
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const createShift = async (req: AuthRequest, res: Response) => {
  try {
    const { name, startTime, endTime, breakMins, days, otRate, otRateHoliday, color } = req.body;
    if (!name || !startTime || !endTime) {
      return res.status(400).json({ message: 'name, startTime, endTime are required' });
    }
    const shift = await prisma.shift.create({
      data: {
        name,
        startTime,
        endTime,
        breakMins: Number(breakMins) || 60,
        days: Array.isArray(days) ? JSON.stringify(days) : days,
        otRate: Number(otRate) || 1.5,
        otRateHoliday: Number(otRateHoliday) || 3.0,
        color: color || '#3B82F6'
      }
    });
    await writeAudit({
      userId: req.user!.id, action: 'CREATE', module: 'settings',
      recordId: String(shift.id), details: `Created shift: ${shift.name}`,
      ipAddress: req.ip
    });
    res.status(201).json({
      ...shift,
      days: typeof shift.days === 'string' ? JSON.parse(shift.days) : shift.days
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const updateShift = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, startTime, endTime, breakMins, days, otRate, otRateHoliday, color } = req.body;
    const shift = await prisma.shift.update({
      where: { id: Number(id) },
      data: {
        ...(name && { name }),
        ...(startTime && { startTime }),
        ...(endTime && { endTime }),
        ...(breakMins !== undefined && { breakMins: Number(breakMins) }),
        ...(days !== undefined && { days: Array.isArray(days) ? JSON.stringify(days) : days }),
        ...(otRate !== undefined && { otRate: Number(otRate) }),
        ...(otRateHoliday !== undefined && { otRateHoliday: Number(otRateHoliday) }),
        ...(color && { color })
      }
    });
    await writeAudit({
      userId: req.user!.id, action: 'UPDATE', module: 'settings',
      recordId: String(id), details: `Updated shift: ${shift.name}`,
      ipAddress: req.ip
    });
    res.json({
      ...shift,
      days: typeof shift.days === 'string' ? JSON.parse(shift.days) : shift.days
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const deleteShift = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    // Check if any employees are assigned to this shift
    const empCount = await prisma.employee.count({ where: { shiftId: Number(id) } });
    if (empCount > 0) {
      return res.status(400).json({ 
        message: `ไม่สามารถลบกะได้ มีพนักงาน ${empCount} คนที่ใช้กะนี้อยู่` 
      });
    }
    await prisma.shift.delete({ where: { id: Number(id) } });
    await writeAudit({
      userId: req.user!.id, action: 'DELETE', module: 'settings',
      recordId: String(id), details: `Deleted shift id: ${id}`,
      ipAddress: req.ip
    });
    res.json({ message: 'ลบกะสำเร็จ' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};
```

---

## STEP 2: Fix getShiftSwaps — add include + scope

Update existing getShiftSwaps():

```typescript
export const getShiftSwaps = async (req: AuthRequest, res: Response) => {
  try {
    // Apply scope: HR sees all, EMPLOYEE sees only own swaps
    const where: any = {};
    if (req.user && req.user.level <= 10) {
      where.OR = [
        { reqEmpId: req.user.empId },
        { targetEmpId: req.user.empId }
      ];
    }
    
    const swaps = await prisma.shiftSwap.findMany({
      where,
      include: {
        reqEmployee: {
          select: { id: true, name: true, empCode: true, deptId: true,
            department: { select: { name: true } } }
        },
        targetEmployee: {
          select: { id: true, name: true, empCode: true, deptId: true,
            department: { select: { name: true } } }
        }
      },
      orderBy: { id: 'desc' }
    });
    res.json(swaps);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};
```

---

## STEP 3: Update shift.routes.ts

```typescript
import { Router } from 'express';
import { authenticate, requirePermission } from '../middlewares/auth.middleware';
import {
  getShifts, createShift, updateShift, deleteShift,
  getShiftSwaps, createShiftSwap, updateShiftSwapStatus
} from '../controllers/shift.controller';

const router = Router();

// Shift CRUD
router.get('/',     authenticate, requirePermission('shift:view'),   getShifts);
router.post('/',    authenticate, requirePermission('shift:create'), createShift);
router.put('/:id',  authenticate, requirePermission('shift:edit'),   updateShift);
router.delete('/:id', authenticate, requirePermission('shift:delete'), deleteShift);

// Shift Swaps — must come BEFORE /:id to avoid conflict
router.get('/swaps',     authenticate, requirePermission('shift:view'),    getShiftSwaps);
router.post('/swaps',    authenticate, requirePermission('shift:create'),  createShiftSwap);
router.put('/swaps/:id', authenticate, requirePermission('shift:approve'), updateShiftSwapStatus);

export default router;
```

NOTE: /swaps routes must be registered BEFORE /:id 
otherwise Express matches "swaps" as an :id param.
Show me the final route file before committing.

---

## STEP 4: Add import for writeAudit in shift.controller.ts

```typescript
import { writeAudit } from '../utils/audit';
```

---

## STEP 5: Frontend — add delete button for shifts

ShiftManagement.jsx currently has no delete button.
Add to shift list table actions column:

```jsx
<Btn variant="danger" size="sm" onClick={() => handleDeleteShift(r.id)}>ลบ</Btn>
```

Add handler:
```javascript
const handleDeleteShift = async (id) => {
  try {
    await api.delete(`/shifts/${id}`);
    setShifts(p => p.filter(s => s.id !== id));
    showToast('ลบกะสำเร็จ', 'success');
  } catch (err) {
    showToast(err.response?.data?.message || 'ลบไม่สำเร็จ', 'error');
  }
};
```

Use ConfirmModal instead of window.confirm:
```javascript
const [confirmDelete, setConfirmDelete] = useState(null);
// onClick → setConfirmDelete(r.id)
// ConfirmModal onConfirm → handleDeleteShift(confirmDelete)
```

---

## Verification

1. curl GET /api/shifts → 200 + array of shifts with days as array (not string)
2. curl POST /api/shifts {"name":"กะกลางคืน","startTime":"22:00","endTime":"06:00","breakMins":60,"days":["Mon","Tue","Wed","Thu","Fri"]} → 201 created
3. curl PUT /api/shifts/<id> {"color":"#EF4444"} → 200 updated
4. curl DELETE /api/shifts/<id that has employees> → 400 with Thai error message
5. curl GET /api/shifts/swaps as EMPLOYEE → only own swaps (scope filter)
6. Open ShiftManagement → tab "รายชื่อกะ" loads real data (not empty)
7. git log --oneline -5 (backend repo)
8. git log --oneline -3 (hris/ repo)

Show ALL outputs.

---

## Commit Strategy

Backend:
  feat(shift): add Shift CRUD endpoints (GET, POST, PUT, DELETE)
  fix(shift): add scope filter and employee relation to getShiftSwaps

Frontend (hris/):
  feat(shift): add delete shift button with ConfirmModal

3 commits total. Show diff before each commit.