export interface Simulation {
  /** ISO-8601 datetime */
  createdAt: string;
  expired: boolean;
  /** UUID */
  simulationId: string;
  userId: string;
  mission: Mission;
  data: {
    eventLog: {
      key: string;
      value: string;
    }[];
    stageTrajectories: {
      stageNumber: number;
      events: DataPoint[];
      landing?: DataPoint;
      orbit?: unknown;
      telemetry: DataPoint[];
    }[];
  };
}

export interface Mission {
  code: string;
  description: string;
  /** ISO-8601 datetime */
  datetime: string;
  launchpad: {
    code: string;
    description: string;
    /** 2 letter country code */
    country: string;
    /** 2 letter state code */
    state: string;
    latitude: number;
    longitude: number;
    elevation: number;
  };
  company: {
    code: string;
    description: string;
  };
  display: boolean;
  /** UUID */
  livelaunch: string;
  launchLibraryId: number;
  /** UUID */
  launchLibraryV2Id: string;
  payload: {
    /** Kilograms */
    mass: number;
  };
  vehicle: Vehicle;
  sequences: {
    id?: unknown;
    sequenceId: string;
    name: string;
    events: {
      id: string;
      type: string;
      name: string;
      stageNumbers: number[];
      attitudeTarget: {
        elevation: number;
        azimuth: number;
        maintainAttitudeOnceReached: boolean;
      };
      propellantMassTarget: {
        /** Kilograms */
        mass: number;
      };
      throttleTarget: unknown[];
      start: EventData;
      stop: EventData;
      sequenceId: string;
    }[];
    autoSequenceType?: unknown;
    meta: unknown[];
    default: boolean;
  }[];
  landingZones?: LandingZone[];
  webcastMatchConfig: {
    priority: boolean;
    launchLibraryId: number;
    /** UUID */
    launchLibraryV2Id: string;
    launchAzimuth: number;
    throttleController: {
      type: string;
      controller: Controller;
    };
    headingController: {
      type: string;
      controller: Controller;
    };
  };
  _id: string;
}

export interface EventData {
  switches: {
    variable: string;
    value: number;
    relativeTo: {
      eventId: string;
      field: string;
    };
  }[];
}

export interface DataPoint {
  time: number;
  /** Kilometers ASL */
  altitude: number;
  velocity: number;
  downrangeDistance: number;
  aerodynamicPressure: number;
  propellantMass: number;
  flowRate: number;
  deltaVTotal?: number;
  deltaVGravity?: number;
  deltaVDrag?: number;
  throttle: number;
  acceleration: number;
  angleOfAttack: number;
  angleOfVelocity: number;
  elevation: number;
  dragCoefficient: number;
  azimuth: number;
  thrustCoefficient?: number;
  latitude: number;
  longitude: number;
  thrust: number;
  isp?: number;
  iipLatitude: number;
  iipLongitude: number;
  engineThrottles: number[];
  xinertialRF: number;
  yinertialRF: number;
  zinertialRF: number;
  xfixedRF: number;
  yfixedRF: number;
  zfixedRF: number;
}

export interface Vehicle {
  description: string;
  cores: VehicleCore[];
}

export interface VehicleCore {
  name: string;
  radius: number;
  length: number;
  dryMass: number;
  fuelCapacity: number;
  maxAccel: number;
  propMass: number;
  minimumFuel: number;
  displayName: string;
  stageNumber: number;
  engineTypes: {
    engineTypeId: string;
    spec: {
      name: string;
      mass: number;
      ispSL: number;
      ispVac: number;
      thrustSL: number;
      thrustVac: number;
      throttleCapability: number;
      secondsToFullThrust: number;
      displayName: string;
    };
  }[];
  engineStates: { engineTypeId: string; engineNumber: number }[];
  boosters: unknown[];
}

export interface LandingZone {
  id: string;
  name: string;
  longitude: number;
  latitude: number;
  radius: number;
}

export interface Controller {
  k_p: number;
  k_i: number;
  k_d: number;
}

export interface EventSummary {
  name: string;
  latitude: number;
  longitude: number;
  altitude: number;
}
