import { Request, Response } from 'express';
import { prisma } from '../config/prisma';

export const getMenuBySlug = async (req: Request, res: Response): Promise<void> => {
  try {
    const slug = req.params.slug as string;

    const merchant = await prisma.merchant.findUnique({
      where: { slug },
      select: {
        id: true,
        name: true,
        logoUrl: true,
        phone: true,
        deliveryFee: true,
        minOrderValue: true,
        businessHours: true,
        address: true,
        paymentMethods: true,
        planStatus: true,
        planExpiresAt: true,
        products: {
          where: { available: true },
          orderBy: { category: 'asc' },
          include: { optionGroups: { include: { options: true } } }
        }
      }
    });

    if (!merchant) {
      res.status(404).json({ error: 'Menu not found' });
      return;
    }

    let planStatus = merchant.planStatus;
    if (merchant.planExpiresAt && planStatus === 'active') {
      const gracePeriodMs = 3 * 24 * 60 * 60 * 1000;
      if (new Date(merchant.planExpiresAt).getTime() + gracePeriodMs < new Date().getTime()) {
        await prisma.merchant.update({
          where: { id: merchant.id },
          data: { planStatus: 'inactive' }
        });
        planStatus = 'inactive';
      }
    }

    const checkIsOpen = (businessHours: string | null): boolean => {
      if (!businessHours) return true;
      
      const match = businessHours.match(/(.*)\s+das\s+(.*)\s+às\s+(.*)/i);
      if (!match) return true;

      const rawDays = match[1];
      const openTime = match[2];
      const closeTime = match[3];

      const DAYS_OF_WEEK = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
      const normalizedDays = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];
      
      const normalize = (str: string) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

      const selected = new Set<string>();
      const parts = rawDays.replace(/ e /gi, ',').split(',').map((s: string) => normalize(s.trim()));
      parts.forEach((part: string) => {
        const rangeMatch = part.match(/(.*)\s+a\s+(.*)/i);
        if (rangeMatch) {
          const start = normalizedDays.indexOf(normalize(rangeMatch[1]));
          const end = normalizedDays.indexOf(normalize(rangeMatch[2]));
          if (start !== -1 && end !== -1 && start <= end) {
            for (let i = start; i <= end; i++) selected.add(normalizedDays[i]);
          }
        } else {
          const found = normalizedDays.find(d => d === part);
          if (found) selected.add(found);
        }
      });
      if (normalize(rawDays) === 'todos os dias') {
        normalizedDays.forEach(d => selected.add(d));
      }

      // Current time in Brazil
      const now = new Date(new Date().toLocaleString("en-US", {timeZone: "America/Sao_Paulo"}));
      const currentDayIdx = now.getDay();
      const previousDayIdx = currentDayIdx === 0 ? 6 : currentDayIdx - 1;
      
      const currentDay = normalizedDays[currentDayIdx];
      const previousDay = normalizedDays[previousDayIdx];

      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      const [openH, openM] = openTime.split(':').map(Number);
      const openMinutes = openH * 60 + openM;
      
      const [closeH, closeM] = closeTime.split(':').map(Number);
      let closeMinutes = closeH * 60 + closeM;

      const crossesMidnight = closeMinutes <= openMinutes;

      // Check if it's open from a shift that started today
      if (selected.has(currentDay)) {
        if (crossesMidnight) {
          if (currentMinutes >= openMinutes || currentMinutes <= closeH * 60 + closeM) {
             return true;
          }
        } else {
          if (currentMinutes >= openMinutes && currentMinutes <= closeMinutes) {
            return true;
          }
        }
      }

      // Check if it's open from a shift that started yesterday and crossed midnight
      if (crossesMidnight && selected.has(previousDay)) {
        if (currentMinutes <= closeH * 60 + closeM) {
          return true;
        }
      }

      return false;
    };

    const isOpen = checkIsOpen(merchant.businessHours);

    res.json({ ...merchant, planStatus, isOpen });
  } catch (error) {
    console.error('Error fetching menu:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
