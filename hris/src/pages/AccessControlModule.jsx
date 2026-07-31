import React, { useState, useEffect } from 'react';
import { SectionHeader, Card, Tbl, Badge, Btn, Tabs, Modal, Inp } from '../components/common/UI';
import { C } from '../utils/theme';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { useToast } from '../components/common/Toast';
import { ConfirmModal } from '../components/common/ConfirmModal';

const ROLE_COLORS = {
  SUPER_ADMIN: { bg: C.purpleLight, color: C.purple },
  SYSTEM_ADMIN: { bg: C.purpleLight, color: C.purple },
  HR_DIRECTOR: { bg: C.brandLight, color: C.brand },
  HR_MANAGER: { bg: C.brandLight, color: C.brand },
  PAYROLL_MANAGER: { bg: C.warningLight, color: C.warning },
  PAYROLL_OFFICER: { bg: C.warningLight, color: C.warning },
  DEPT_MANAGER: { bg: C.successLight, color: C.success },
  EMPLOYEE: { bg: "#f1f5f9", color: "#475569" },
};

export const AccessControlModule = ({ user: currentUser }) => {
  const { showToast } = useToast();
  const [tab, setTab] = useState("users");
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState({});
  const [loading, setLoading] = useState(true);
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [newUser, setNewUser] = useState({ email: "", password: "", roleIds: [] });
  const [selectedUser, setSelectedUser] = useState(null);
  const [userRoleIds, setUserRoleIds] = useState([]);

  // AuthGroup States
  const [authGroups, setAuthGroups] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);
  const [newGroup, setNewGroup] = useState({ name: "", description: "", color: "#3B82F6", scopeDeptIds: "[]", permissionIds: [] });
  const [showMemberModal, setShowMemberModal] = useState(null); // stores groupId
  const [groupMembers, setGroupMembers] = useState([]);
  const [memberUserIds, setMemberUserIds] = useState([]);
  const [confirmState, setConfirmState] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const [u, r, p, ag, d] = await Promise.all([
        api.get('/rbac/users'),
        api.get('/rbac/roles'),
        api.get('/rbac/permissions'),
        api.get('/auth-groups'),
        api.get('/departments?flat=true&limit=100')
      ]);
      setUsers(Array.isArray(u.data) ? u.data : []);
      setRoles(Array.isArray(r.data) ? r.data : []);
      setPermissions(typeof p.data === 'object' ? p.data : {});
      setAuthGroups(Array.isArray(ag.data) ? ag.data : []);
      setDepartments(Array.isArray(d.data) ? d.data : (d.data?.data || []));
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openAssignRole = (u) => {
    setSelectedUser(u);
    setUserRoleIds(u.roles?.map(r => r.id) || []);
  };

  const saveAssignRole = async () => {
    await api.put(`/rbac/users/${selectedUser.id}/roles`, { roles: userRoleIds.map(id => ({ roleId: id })) });
    setSelectedUser(null);
    load();
  };

  const toggleActive = async (id) => {
    await api.put(`/rbac/users/${id}/toggle`);
    load();
  };

  const createUser = async () => {
    if (!newUser.email || !newUser.password) return showToast('กรุณากรอกอีเมลและรหัสผ่าน', 'error');
    try {
      await api.post('/rbac/users', { ...newUser });
      setShowUserModal(false);
      setNewUser({ email: "", password: "", roleIds: [] });
      load();
    } catch (err) {
      showToast(err.response?.data?.message || 'เกิดข้อผิดพลาด', 'error');
    }
  };

  const loadGroups = async () => {
    const ag = await api.get('/auth-groups');
    setAuthGroups(Array.isArray(ag.data) ? ag.data : []);
  };

  const openGroupModal = (g = null) => {
    if (g) {
      setEditingGroup(g.id);
      setNewGroup({
        name: g.name, description: g.description || "", color: g.color || "#3B82F6",
        scopeDeptIds: g.scopeDeptIds || "[]",
        permissionIds: g.permissions?.map(p => {
          // Find permission ID by code from permissions object
          for (const mod in permissions) {
            const found = permissions[mod].find(x => x.code === p);
            if (found) return found.id;
          }
          return null;
        }).filter(Boolean) || []
      });
    } else {
      setEditingGroup(null);
      setNewGroup({ name: "", description: "", color: "#3B82F6", scopeDeptIds: "[]", permissionIds: [] });
    }
    setShowGroupModal(true);
  };

  const saveGroup = async () => {
    if (!newGroup.name) return showToast('กรุณากรอกชื่อกลุ่ม', 'error');
    try {
      if (editingGroup) {
        await api.put(`/auth-groups/${editingGroup}`, newGroup);
      } else {
        await api.post('/auth-groups', newGroup);
      }
      setShowGroupModal(false);
      loadGroups();
    } catch (err) {
      showToast('เกิดข้อผิดพลาด', 'error');
    }
  };

  const deleteGroup = (id, name) => {
    setConfirmState({ id, name });
  };

  const handleConfirmDelete = async () => {
    try {
      await api.delete(`/auth-groups/${confirmState.id}`);
      setConfirmState(null);
      loadGroups();
      showToast('ปิดใช้งาน AuthGroup สำเร็จ', 'success');
    } catch (err) {
      showToast('เกิดข้อผิดพลาด', 'error');
    }
  };

  const openMembers = async (groupId) => {
    setShowMemberModal(groupId);
    const m = await api.get(`/auth-groups/${groupId}/members`);
    setGroupMembers(Array.isArray(m.data) ? m.data : []);
    setMemberUserIds([]);
  };

  const addMembers = async () => {
    if (!memberUserIds.length) return;
    await api.post(`/auth-groups/${showMemberModal}/members`, { userIds: memberUserIds });
    openMembers(showMemberModal);
    loadGroups();
  };

  const removeMember = async (userId) => {
    await api.delete(`/auth-groups/${showMemberModal}/members/${userId}`);
    openMembers(showMemberModal);
    loadGroups();
  };

  return (
    <div>
      <SectionHeader title="Access Control" sub="จัดการผู้ใช้ บทบาท และสิทธิ์การเข้าถึงระบบ" />
      <Tabs tabs={[
        { id: "users", label: "ผู้ใช้งาน" },
        { id: "roles", label: "Roles & Permissions" },
        { id: "auth_groups", label: "Auth Groups" },
      ]} active={tab} onChange={setTab} />

      {loading && <div style={{ padding: 40, textAlign: "center", color: C.textMuted }}>กำลังโหลด...</div>}

      {/* ── Users Tab ── */}
      {!loading && tab === "users" && (
        <Card style={{ padding: 0 }}>
          <div style={{ padding: "12px 20px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontWeight: 700 }}>ผู้ใช้งานทั้งหมด ({users.length} คน)</div>
            <Btn onClick={() => setShowUserModal(true)}>+ เพิ่มผู้ใช้</Btn>
          </div>
          <Tbl columns={[
            { key: "email", label: "อีเมล", render: r => (
              <div>
                <div style={{ fontWeight: 600 }}>{r.email}</div>
                <div style={{ fontSize: 11, color: C.textMuted }}>{r.employee?.name || "-"}</div>
              </div>
            )},
            { key: "roles", label: "บทบาท", render: r => (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {r.roles?.length ? r.roles.map(role => {
                  const cfg = ROLE_COLORS[role.code] || { bg: "#f1f5f9", color: "#475569" };
                  return <Badge key={role.id} label={role.name} bg={cfg.bg} color={cfg.color} />;
                }) : <span style={{ color: C.textLight, fontSize: 12 }}>ไม่มีบทบาท</span>}
              </div>
            )},
            { key: "status", label: "สถานะ", render: r => r.isActive
              ? <Badge label="Active" bg={C.successLight} color={C.success} />
              : <Badge label="Inactive" bg={C.dangerLight} color={C.danger} />
            },
            { key: "actions", label: "", render: r => (
              <div style={{ display: "flex", gap: 6 }}>
                <Btn variant="secondary" size="sm" onClick={() => openAssignRole(r)}>กำหนด Role</Btn>
                {r.id !== currentUser.id && (
                  <Btn variant={r.isActive ? "danger" : "success"} size="sm" onClick={() => toggleActive(r.id)}>
                    {r.isActive ? "ระงับ" : "เปิดใช้"}
                  </Btn>
                )}
              </div>
            )},
          ]} data={users} />
        </Card>
      )}

      {/* ── Roles Tab ── */}
      {!loading && tab === "roles" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {roles.map(role => {
            const cfg = ROLE_COLORS[role.code] || { bg: "#f1f5f9", color: "#475569" };
            return (
              <Card key={role.id}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ background: cfg.bg, color: cfg.color, padding: "4px 12px", borderRadius: 20, fontWeight: 700, fontSize: 13 }}>{role.name}</div>
                    <div style={{ fontSize: 12, color: C.textMuted }}>Level {role.level}</div>
                    <div style={{ fontSize: 12, color: C.textMuted }}>· {role._count?.userRoles || 0} คน · {role._count?.permissions || 0} สิทธิ์</div>
                  </div>
                </div>
                <div style={{ fontSize: 12, color: C.textMuted }}>{role.description}</div>
              </Card>
            );
          })}
          {/* Permission Matrix */}
          <Card>
            <div style={{ fontWeight: 700, marginBottom: 16 }}>Permission Matrix</div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr style={{ background: "#f8fafc" }}>
                    <th style={{ textAlign: "left", padding: "8px 12px", borderBottom: `1px solid ${C.border}` }}>Module</th>
                    {["view","create","edit","delete","approve","export"].map(a => (
                      <th key={a} style={{ padding: "8px 8px", borderBottom: `1px solid ${C.border}`, textTransform: "capitalize", color: C.textMuted }}>{a}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Object.keys(permissions).map(mod => (
                    <tr key={mod} style={{ borderBottom: `1px solid ${C.borderLight}` }}>
                      <td style={{ padding: "8px 12px", fontWeight: 600, textTransform: "capitalize" }}>{mod.replace("_", " ")}</td>
                      {["view","create","edit","delete","approve","export"].map(act => {
                        const code = `${mod}:${act}`;
                        const exists = permissions[mod]?.some(p => p.code === code);
                        return <td key={act} style={{ textAlign: "center", padding: "8px" }}>{exists ? "✅" : <span style={{ color: "#e2e8f0" }}>—</span>}</td>;
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ── Auth Groups Tab ── */}
      {!loading && tab === "auth_groups" && (
        <Card style={{ padding: 0 }}>
          <div style={{ padding: "16px 20px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontWeight: 700 }}>Authorization Groups ({authGroups.length} กลุ่ม)</div>
            <Btn onClick={() => openGroupModal()}>+ สร้างกลุ่มใหม่</Btn>
          </div>
          <Tbl columns={[
            { key: "name", label: "ชื่อกลุ่ม", render: r => (
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 12, height: 12, borderRadius: "50%", background: r.color || C.brand }}></div>
                <div>
                  <div style={{ fontWeight: 600 }}>{r.name}</div>
                  <div style={{ fontSize: 11, color: C.textMuted }}>{r.description || "-"}</div>
                </div>
              </div>
            )},
            { key: "scope", label: "Data Scope (แผนก)", render: r => {
              const ids = JSON.parse(r.scopeDeptIds || "[]");
              return ids.length > 0 ? (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                  {ids.map(id => {
                    const d = departments.find(x => x.id === Number(id));
                    return <Badge key={id} label={d ? d.name : `Dept ${id}`} bg={C.bg} color={C.textMuted} />;
                  })}
                </div>
              ) : <span style={{ color: C.textLight }}>ไม่มี (ไม่จำกัด Data Scope)</span>;
            }},
            { key: "perms", label: "สิทธิ์เพิ่มเติม", render: r => (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {r.permissions?.slice(0,3).map(p => <Badge key={p} label={p.split(':')[1]} bg={C.brandLight} color={C.brand} />)}
                {r.permissions?.length > 3 && <Badge label={`+${r.permissions.length - 3}`} bg={C.bg} color={C.textMuted} />}
                {!r.permissions?.length && <span style={{ color: C.textLight }}>-</span>}
              </div>
            )},
            { key: "members", label: "สมาชิก", render: r => (
              <div style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }} onClick={() => openMembers(r.id)}>
                <Badge label={`${r.memberCount || 0} คน`} bg={C.successLight} color={C.success} />
                <span style={{ fontSize: 11, color: C.brand }}>จัดการ</span>
              </div>
            )},
            { key: "actions", label: "", render: r => (
              <div style={{ display: "flex", gap: 6 }}>
                <Btn variant="secondary" size="sm" onClick={() => openGroupModal(r)}>แก้ไข</Btn>
                <Btn variant="danger" size="sm" onClick={() => deleteGroup(r.id, r.name)}>ปิดใช้งาน</Btn>
              </div>
            )},
          ]} data={authGroups} />
        </Card>
      )}

      {/* Assign Role Modal */}
      {selectedUser && (
        <Modal title={`กำหนด Role: ${selectedUser.email}`} onClose={() => setSelectedUser(null)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ fontSize: 13, color: C.textMuted, marginBottom: 4 }}>เลือกบทบาทที่ต้องการมอบหมาย (เลือกได้หลาย Role)</div>
            {roles.map(role => {
              const cfg = ROLE_COLORS[role.code] || { bg: "#f1f5f9", color: "#475569" };
              const checked = userRoleIds.includes(role.id);
              return (
                <label key={role.id} style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", padding: "8px 12px", borderRadius: 8, background: checked ? cfg.bg : "#f8fafc", border: `1px solid ${checked ? cfg.color : C.border}` }}>
                  <input type="checkbox" checked={checked} onChange={() => setUserRoleIds(p => p.includes(role.id) ? p.filter(id => id !== role.id) : [...p, role.id])} />
                  <div>
                    <div style={{ fontWeight: 600, color: cfg.color }}>{role.name}</div>
                    <div style={{ fontSize: 11, color: C.textMuted }}>{role.description}</div>
                  </div>
                </label>
              );
            })}
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
              <Btn variant="ghost" onClick={() => setSelectedUser(null)}>ยกเลิก</Btn>
              <Btn onClick={saveAssignRole}>บันทึก</Btn>
            </div>
          </div>
        </Modal>
      )}

      {/* Create User Modal */}
      {showUserModal && (
        <Modal title="เพิ่มผู้ใช้งาน" onClose={() => setShowUserModal(false)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <Inp label="อีเมล" value={newUser.email} onChange={v => setNewUser(p => ({ ...p, email: v }))} type="email" required />
            <Inp label="รหัสผ่าน" value={newUser.password} onChange={v => setNewUser(p => ({ ...p, password: v }))} type="password" required />
            <div style={{ fontSize: 12, fontWeight: 600, color: C.textMuted, marginBottom: 4 }}>บทบาทเริ่มต้น</div>
            {roles.map(role => (
              <label key={role.id} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                <input type="checkbox" checked={(newUser.roleIds||[]).includes(role.id)} onChange={() => setNewUser(p => ({ ...p, roleIds: (p.roleIds||[]).includes(role.id) ? p.roleIds.filter(id=>id!==role.id) : [...(p.roleIds||[]), role.id] }))} />
                <span>{role.name}</span>
              </label>
            ))}
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <Btn variant="ghost" onClick={() => setShowUserModal(false)}>ยกเลิก</Btn>
              <Btn onClick={createUser}>สร้างผู้ใช้</Btn>
            </div>
          </div>
        </Modal>
      )}

      {/* Group Modal */}
      {showGroupModal && (
        <Modal title={editingGroup ? "แก้ไข AuthGroup" : "สร้าง AuthGroup"} onClose={() => setShowGroupModal(false)} width={600}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14, maxHeight: "70vh", overflowY: "auto", paddingRight: 10 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <Inp label="ชื่อกลุ่ม" value={newGroup.name} onChange={v => setNewGroup(p => ({ ...p, name: v }))} required />
              <Inp label="สีของกลุ่ม (Hex)" value={newGroup.color} onChange={v => setNewGroup(p => ({ ...p, color: v }))} type="color" />
            </div>
            <Inp label="คำอธิบาย" value={newGroup.description} onChange={v => setNewGroup(p => ({ ...p, description: v }))} />
            
            <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 14 }}>
              <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8 }}>Data Scope (แผนกที่เปิดให้เข้าถึง)</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, maxHeight: 150, overflowY: "auto", padding: 8, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8 }}>
                {departments.map(d => {
                  const arr = JSON.parse(newGroup.scopeDeptIds || "[]");
                  const checked = arr.includes(d.id);
                  return (
                    <label key={d.id} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13 }}>
                      <input type="checkbox" checked={checked} onChange={() => {
                        const next = checked ? arr.filter(x => x !== d.id) : [...arr, d.id];
                        setNewGroup(p => ({ ...p, scopeDeptIds: JSON.stringify(next) }));
                      }} />
                      {d.name}
                    </label>
                  );
                })}
              </div>
            </div>

            <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 14 }}>
              <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8 }}>Permissions (สิทธิ์ที่ให้เพิ่ม)</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {Object.keys(permissions).map(mod => (
                  <div key={mod}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: C.textMuted, marginBottom: 4, textTransform: "capitalize" }}>{mod.replace("_", " ")}</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {permissions[mod].map(p => {
                        const checked = newGroup.permissionIds.includes(p.id);
                        return (
                          <label key={p.id} style={{ display: "inline-flex", alignItems: "center", gap: 4, cursor: "pointer", fontSize: 12, background: checked ? C.brandLight : C.surface, color: checked ? C.brand : C.text, padding: "4px 8px", borderRadius: 12, border: `1px solid ${checked ? C.brand : C.border}` }}>
                            <input type="checkbox" checked={checked} style={{ display: "none" }} onChange={() => {
                              setNewGroup(prev => ({ ...prev, permissionIds: checked ? prev.permissionIds.filter(id => id !== p.id) : [...prev.permissionIds, p.id] }));
                            }} />
                            {p.action}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 10 }}>
              <Btn variant="ghost" onClick={() => setShowGroupModal(false)}>ยกเลิก</Btn>
              <Btn onClick={saveGroup}>บันทึกกลุ่ม</Btn>
            </div>
          </div>
        </Modal>
      )}

      {/* Member Modal */}
      {showMemberModal && (
        <Modal title="จัดการสมาชิกในกลุ่ม" onClose={() => setShowMemberModal(null)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "flex", gap: 10 }}>
              <div style={{ flex: 1, border: `1px solid ${C.border}`, borderRadius: 8, padding: 8, maxHeight: 150, overflowY: "auto" }}>
                {users.filter(u => u.isActive && !groupMembers.some(m => m.userId === u.id)).map(u => (
                  <label key={u.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: 4, cursor: "pointer", fontSize: 13 }}>
                    <input type="checkbox" checked={memberUserIds.includes(u.id)} onChange={() => {
                      setMemberUserIds(p => p.includes(u.id) ? p.filter(id => id !== u.id) : [...p, u.id]);
                    }} />
                    {u.email} {u.employee ? `(${u.employee.name})` : ""}
                  </label>
                ))}
              </div>
              <Btn onClick={addMembers} disabled={!memberUserIds.length}>+ เพิ่มเข้ากลุ่ม</Btn>
            </div>

            <div style={{ fontWeight: 600, fontSize: 13, marginTop: 10 }}>สมาชิกปัจจุบัน ({groupMembers.length} คน)</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 300, overflowY: "auto" }}>
              {groupMembers.map(m => (
                <div key={m.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: C.surface, padding: "8px 12px", borderRadius: 8, border: `1px solid ${C.border}` }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{m.user.email}</div>
                    <div style={{ fontSize: 11, color: C.textMuted }}>{m.user.roles?.join(', ')}</div>
                  </div>
                  <Btn variant="ghost" size="sm" onClick={() => removeMember(m.userId)} style={{ color: C.danger }}>ลบ</Btn>
                </div>
              ))}
              {!groupMembers.length && <div style={{ fontSize: 12, color: C.textMuted, textAlign: "center", padding: 20 }}>ยังไม่มีสมาชิกในกลุ่มนี้</div>}
            </div>
          </div>
        </Modal>
      )}

      {/* Confirm Delete AuthGroup Modal */}
      {confirmState && (
        <ConfirmModal
          title="ยืนยันการปิดใช้งาน"
          message={`ปิดใช้งาน AuthGroup "${confirmState.name}"?`}
          onConfirm={handleConfirmDelete}
          onClose={() => setConfirmState(null)}
        />
      )}
    </div>
  );
};