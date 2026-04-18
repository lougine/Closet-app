jest.mock('../../src/models/garment', () => ({
  countDocuments: jest.fn(),
  aggregate: jest.fn(),
}));

jest.mock('../../src/models/outfit', () => ({
  aggregate: jest.fn(),
}));

jest.mock('../../src/models/usage', () => ({
  aggregate: jest.fn(),
}));

const analyticsController = require('../../src/controllers/analyticsController');
const Garment = require('../../src/models/garment');
const Outfit = require('../../src/models/outfit');
const Usage = require('../../src/models/usage');

function createRes() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  };
}

describe('analyticsController calendar-based counting', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('getOverview computes wear metrics from usage events with outfit fallback available', async () => {
    const req = { user: { userId: '680000000000000000000001' } };
    const res = createRes();

    Garment.countDocuments.mockResolvedValue(10);
    Outfit.aggregate.mockResolvedValueOnce([
      { total: 4 },
    ]);
    Outfit.aggregate.mockResolvedValueOnce([
      {
        totalWearEvents: 12,
        wornGarmentCount: 9,
        outfitsWornCount: 4,
      },
    ]);
    Usage.aggregate.mockResolvedValue([
      {
        totalWearEvents: 8,
        wornGarmentCount: 6,
        outfitsWornCount: 4,
      },
    ]);

    await analyticsController.getOverview(req, res);

    expect(Garment.countDocuments).toHaveBeenCalledTimes(1);
    expect(Outfit.aggregate).toHaveBeenCalledTimes(2);
    expect(Usage.aggregate).toHaveBeenCalledTimes(1);

    const countPipeline = Outfit.aggregate.mock.calls[0][0];
    expect(countPipeline).toEqual(expect.arrayContaining([
      expect.objectContaining({
        $match: expect.objectContaining({ isLookbook: { $ne: true } }),
      }),
      expect.objectContaining({ $count: 'total' }),
    ]));

    const fallbackPipeline = Outfit.aggregate.mock.calls[1][0];
    expect(fallbackPipeline).toEqual(expect.arrayContaining([
      expect.objectContaining({ $unwind: '$garments' }),
    ]));

    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      totalItems: 10,
      totalOutfits: 4,
      outfitsWorn: 4,
      totalWearEvents: 8,
      wardrobeUsagePercent: 60,
      averageWearPerItem: 0.8,
    }));
  });

  test('getUsageTrends returns monthly/day/category wear from usage events', async () => {
    const req = {
      user: { userId: '680000000000000000000001' },
      query: { months: '3' },
    };
    const res = createRes();

    Usage.aggregate.mockResolvedValue([
      {
        monthly: [
          { month: '2026-02', wearCount: 2 },
          { month: '2026-03', wearCount: 3 },
          { month: '2026-04', wearCount: 5 },
        ],
        dayOfWeek: [
          { _id: 1, wearCount: 3 },
          { _id: 4, wearCount: 7 },
        ],
        byCategory: [
          { category: 'Tops', wearCount: 4 },
          { category: 'Bottoms', wearCount: 3 },
        ],
      },
    ]);

    await analyticsController.getUsageTrends(req, res);

    expect(Usage.aggregate).toHaveBeenCalledTimes(1);
    expect(Outfit.aggregate).not.toHaveBeenCalled();

    const pipeline = Usage.aggregate.mock.calls[0][0];
    expect(pipeline).toEqual(expect.arrayContaining([
      expect.objectContaining({
        $lookup: expect.objectContaining({ from: 'garments' }),
      }),
    ]));

    expect(res.status).not.toHaveBeenCalled();

    const payload = res.json.mock.calls[0][0];
    expect(payload.rangeMonths).toBe(3);
    expect(payload.summary.totalWearEventsInRange).toBe(10);
    expect(payload.summary.mostActiveDay).toEqual(
      expect.objectContaining({ dayNumber: 4, wearCount: 7 })
    );
    expect(payload.byCategory).toEqual([
      { category: 'Tops', wearCount: 4 },
      { category: 'Bottoms', wearCount: 3 },
    ]);
  });
});
