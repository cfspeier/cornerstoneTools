import RectangleRoiTool from './RectangleRoiTool.js';
import { getToolState } from './../../stateManagement/toolState.js';
import { getLogger } from '../../util/logger.js';

jest.mock('../../util/logger.js');
jest.mock('./../../stateManagement/toolState.js', () => ({
  getToolState: jest.fn(),
}));

jest.mock('./../../import.js', () => ({
  default: jest.fn(),
}));

jest.mock('./../../externalModules.js', () => ({
  cornerstone: {
    metaData: {
      get: jest.fn(),
    },
    getPixels: () => {
      return [100, 100, 100,
        100, 4, 5,
        100, 3, 6];
    }
  },
}));

const badMouseEventData = 'hello world';
const goodMouseEventData = {
  currentPoints: {
    image: {
      x: 0,
      y: 0,
    },
  },
  viewport: {
    rotation: 0,
  },
};

const image = {
  rowPixelSpacing: 0.8984375,
  columnPixelSpacing: 0.8984375
};

describe('RectangleRoiTool.js', () => {
  describe('default values', () => {
    it('has a default name of "RectangleRoi"', () => {
      const defaultName = 'RectangleRoi';
      const instantiatedTool = new RectangleRoiTool();

      expect(instantiatedTool.name).toEqual(defaultName);
    });

    it('can be created with a custom tool name', () => {
      const customToolName = { name: 'customToolName' };
      const instantiatedTool = new RectangleRoiTool(customToolName);

      expect(instantiatedTool.name).toEqual(customToolName.name);
    });
  });

  describe('createNewMeasurement', () => {
    it('emits console error if required eventData is not provided', () => {
      const instantiatedTool = new RectangleRoiTool();
      const logger = getLogger();

      instantiatedTool.createNewMeasurement(badMouseEventData);

      expect(logger.error).toHaveBeenCalled();
      expect(logger.error.mock.calls[0][0]).toContain(
        'required eventData not supplied to tool'
      );
    });

    // Todo: create a more formal definition of a tool measurement object
    it('returns a tool measurement object', () => {
      const instantiatedTool = new RectangleRoiTool();

      const toolMeasurement = instantiatedTool.createNewMeasurement(
        goodMouseEventData
      );

      expect(typeof toolMeasurement).toBe(typeof {});
    });

    it("returns a measurement with a start and end handle at the eventData's x and y", () => {
      const instantiatedTool = new RectangleRoiTool();

      const toolMeasurement = instantiatedTool.createNewMeasurement(
        goodMouseEventData
      );
      const startHandle = {
        x: toolMeasurement.handles.start.x,
        y: toolMeasurement.handles.start.y,
      };
      const endHandle = {
        x: toolMeasurement.handles.end.x,
        y: toolMeasurement.handles.end.y,
      };

      expect(startHandle.x).toBe(goodMouseEventData.currentPoints.image.x);
      expect(startHandle.y).toBe(goodMouseEventData.currentPoints.image.y);
      expect(endHandle.x).toBe(goodMouseEventData.currentPoints.image.x);
      expect(endHandle.y).toBe(goodMouseEventData.currentPoints.image.y);
    });

    it('returns a measurement with a initial rotation', () => {
      const instantiatedTool = new RectangleRoiTool();

      const toolMeasurement = instantiatedTool.createNewMeasurement(
        goodMouseEventData
      );

      const initialRotation = toolMeasurement.handles.initialRotation;

      expect(initialRotation).toBe(goodMouseEventData.viewport.rotation);
    });

    it('returns a measurement with a textBox handle', () => {
      const instantiatedTool = new RectangleRoiTool();

      const toolMeasurement = instantiatedTool.createNewMeasurement(
        goodMouseEventData
      );

      expect(typeof toolMeasurement.handles.textBox).toBe(typeof {});
    });
  });

  describe('pointNearTool', () => {
    let element, coords;

    beforeEach(() => {
      element = jest.fn();
      coords = jest.fn();
    });

    // Todo: Not sure we want all of our methods to check for valid params.
    it('emits a console warning when measurementData without start/end handles are supplied', () => {
      const instantiatedTool = new RectangleRoiTool();
      const noHandlesMeasurementData = {
        handles: {},
      };
      const logger = getLogger();

      instantiatedTool.pointNearTool(element, noHandlesMeasurementData, coords);

      expect(logger.warn).toHaveBeenCalled();
      expect(logger.warn.mock.calls[0][0]).toContain('invalid parameters');
    });

    it('returns false when measurement data is null or undefined', () => {
      const instantiatedTool = new RectangleRoiTool();
      const nullMeasurementData = null;

      const isPointNearTool = instantiatedTool.pointNearTool(
        element,
        nullMeasurementData,
        coords
      );

      expect(isPointNearTool).toBe(false);
    });

    it('returns false when measurement data is not visible', () => {
      const instantiatedTool = new RectangleRoiTool();
      const notVisibleMeasurementData = {
        visible: false,
      };

      const isPointNearTool = instantiatedTool.pointNearTool(
        element,
        notVisibleMeasurementData,
        coords
      );

      expect(isPointNearTool).toBe(false);
    });
  });

  describe('updateCachedStats', () => {
    let element;

    beforeEach(() => {
      element = jest.fn();
    });

    it('should calculate and update annotation values', () => {
      const instantiatedTool = new RectangleRoiTool();

      const data = {
        handles: {
          start: {
            x: 0,
            y: 0
          },
          end: {
            x: 3,
            y: 3
          }
        },
      };
      instantiatedTool.updateCachedStats(image, element, data);
      expect(data.cachedStats.area.toFixed(2)).toEqual('7.26');
      expect(data.cachedStats.mean.toFixed(2)).toEqual('57.56');
      expect(data.cachedStats.stdDev.toFixed(2)).toEqual('47.46');

      data.handles.start.x = 0;
      data.handles.start.y = 0;
      data.handles.end.x = 3;
      data.handles.end.y = 2;

      instantiatedTool.updateCachedStats(image, element, data);
      expect(data.cachedStats.area.toFixed(2)).toEqual('4.84');
      expect(data.cachedStats.mean.toFixed(2)).toEqual('68.17');
      expect(data.cachedStats.stdDev.toFixed(2)).toEqual('45.02');
    });
  });

  describe('renderToolData', () => {
    it('returns undefined when no toolData exists for the tool', () => {
      const instantiatedTool = new RectangleRoiTool();
      const mockEvent = {
        detail: undefined,
        currentTarget: undefined,
      };

      getToolState.mockReturnValueOnce(undefined);

      const renderResult = instantiatedTool.renderToolData(mockEvent);

      expect(renderResult).toBe(undefined);
    });
  });
});
