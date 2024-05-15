import { LevelType } from '@badman/utils';
import { getNewTypeAndLevel } from './get-next-level';

describe('getNewTypeAndLevel', () => {
  const maxLevels = {
    PROV: 5,
    LIGA: 3,
    NATIONAL: 2,
  };

  describe('getNewTypeAndLevel', () => {
    describe('promote next type', () => {
      it('should promote to LIGA when riser is true', () => {
        const { newType, newLevel } = getNewTypeAndLevel(maxLevels, LevelType.PROV, 1, true, false);
        expect(newType).toBe(LevelType.LIGA);
        expect(newLevel).toBe(maxLevels.LIGA);
      });

      it('should promote to NATIONAL when riser is true', () => {
        const { newType, newLevel } = getNewTypeAndLevel(maxLevels, LevelType.LIGA, 1, true, false);
        expect(newType).toBe(LevelType.NATIONAL);
        expect(newLevel).toBe(maxLevels.NATIONAL);
      });

      it('should remain in first even if riser', () => {
        const { newType, newLevel } = getNewTypeAndLevel(
          maxLevels,
          LevelType.NATIONAL,
          1,
          true,
          false,
        );
        expect(newType).toBe(LevelType.NATIONAL);
        expect(newLevel).toBe(1);
      });
    });

    describe('promote next level', () => {
      it('should rise a level in PROV when riser', () => {
        const { newType, newLevel } = getNewTypeAndLevel(maxLevels, LevelType.PROV, 5, true, false);
        expect(newType).toBe(LevelType.PROV);
        expect(newLevel).toBe(4);
      });

      it('should rise a level in LIGA when riser', () => {
        const { newType, newLevel } = getNewTypeAndLevel(maxLevels, LevelType.LIGA, 2, true, false);
        expect(newType).toBe(LevelType.LIGA);
        expect(newLevel).toBe(1);
      });

      it('should rise a level in NATIONAL when riser', () => {
        const { newType, newLevel } = getNewTypeAndLevel(
          maxLevels,
          LevelType.NATIONAL,
          2,
          true,
          false,
        );
        expect(newType).toBe(LevelType.NATIONAL);
        expect(newLevel).toBe(1);
      });
    });

    describe('demote prev type', () => {
      it('should demote to LIGA when faller is true', () => {
        const { newType, newLevel } = getNewTypeAndLevel(
          maxLevels,
          LevelType.NATIONAL,
          maxLevels.NATIONAL,
          false,
          true,
        );
        expect(newType).toBe(LevelType.LIGA);
        expect(newLevel).toBe(1);
      });

      it('should demote to NATIONAL when faller is true', () => {
        const { newType, newLevel } = getNewTypeAndLevel(
          maxLevels,
          LevelType.LIGA,
          maxLevels.LIGA,
          false,
          true,
        );
        expect(newType).toBe(LevelType.PROV);
        expect(newLevel).toBe(1);
      });

      it('should remain in last even if faller', () => {
        const { newType, newLevel } = getNewTypeAndLevel(
          maxLevels,
          LevelType.PROV,
          maxLevels.PROV,
          false,
          true,
        );
        expect(newType).toBe(LevelType.PROV);
        expect(newLevel).toBe(maxLevels.PROV);
      });
    });

    describe('demote prev level', () => {
      it('should fall a level in PROV when faller', () => {
        const { newType, newLevel } = getNewTypeAndLevel(maxLevels, LevelType.PROV, 1, false, true);
        expect(newType).toBe(LevelType.PROV);
        expect(newLevel).toBe(2);
      });

      it('should fall a level in LIGA when faller', () => {
        const { newType, newLevel } = getNewTypeAndLevel(maxLevels, LevelType.LIGA, 1, false, true);
        expect(newType).toBe(LevelType.LIGA);
        expect(newLevel).toBe(2);
      });

      it('should fall a level in NATIONAL when faller', () => {
        const { newType, newLevel } = getNewTypeAndLevel(
          maxLevels,
          LevelType.NATIONAL,
          1,
          false,
          true,
        );
        expect(newType).toBe(LevelType.NATIONAL);
        expect(newLevel).toBe(2);
      });
    });

    describe('no change', () => {
      it('should remain in PROV if no change', () => {
        const { newType, newLevel } = getNewTypeAndLevel(
          maxLevels,
          LevelType.PROV,
          1,
          false,
          false,
        );
        expect(newType).toBe(LevelType.PROV);
        expect(newLevel).toBe(1);
      });

      it('should remain in LIGA if no change', () => {
        const { newType, newLevel } = getNewTypeAndLevel(
          maxLevels,
          LevelType.LIGA,
          1,
          false,
          false,
        );
        expect(newType).toBe(LevelType.LIGA);
        expect(newLevel).toBe(1);
      });

      it('should remain in NATIONAL if no change', () => {
        const { newType, newLevel } = getNewTypeAndLevel(
          maxLevels,
          LevelType.NATIONAL,
          1,
          false,
          false,
        );
        expect(newType).toBe(LevelType.NATIONAL);
        expect(newLevel).toBe(1);
      });
    });
  });
});
