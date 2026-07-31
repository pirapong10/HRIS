import { Request, Response } from 'express';
import { prisma } from '../prisma';

export const getPublicHolidays = async (req: Request, res: Response) => {
  try {
    const holidays = await prisma.publicHoliday.findMany({
      orderBy: { date: 'asc' },
    });
    res.json(holidays);
  } catch (error: any) {
    res.status(500).json({ message: 'Error fetching holidays', details: error.message });
  }
};

export const createPublicHoliday = async (req: Request, res: Response) => {
  try {
    const { date, name } = req.body;
    if (!date || !name) {
      return res.status(400).json({ message: 'Date and name are required' });
    }
    
    const parsedDate = new Date(date);
    if (isNaN(parsedDate.getTime())) {
      return res.status(400).json({ message: 'Invalid date format' });
    }

    const holiday = await prisma.publicHoliday.create({
      data: {
        date: parsedDate,
        name,
      },
    });

    res.status(201).json(holiday);
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(400).json({ message: 'A holiday with this date already exists.' });
    }
    res.status(500).json({ message: 'Error creating holiday', details: error.message });
  }
};

export const updatePublicHoliday = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id)) return res.status(400).json({ message: 'Invalid ID' });

    const { date, name } = req.body;
    const updateData: any = {};
    
    if (date) {
      const parsedDate = new Date(date);
      if (isNaN(parsedDate.getTime())) return res.status(400).json({ message: 'Invalid date format' });
      updateData.date = parsedDate;
    }
    
    if (name) updateData.name = name;

    const holiday = await prisma.publicHoliday.update({
      where: { id },
      data: updateData,
    });

    res.json(holiday);
  } catch (error: any) {
    res.status(500).json({ message: 'Error updating holiday', details: error.message });
  }
};

export const deletePublicHoliday = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id)) return res.status(400).json({ message: 'Invalid ID' });

    await prisma.publicHoliday.delete({
      where: { id },
    });

    res.json({ message: 'Holiday deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ message: 'Error deleting holiday', details: error.message });
  }
};
