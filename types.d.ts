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
  startDateTime: string;
  initialConditions: {
    launchpad: {
      /** ISO-8601 datetime */
      launchDateTime: string;
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
    };
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
  /** time */
  t: number;
  /** system mass */
  m: number;
  /** mass of propellant */
  mp: number[];
  /** mass flow rate */
  md: number[];
  /** system center of mass */
  scom: [number, number, number];
  /** center of mass */
  com: [number, number, number];
  /** center of pressure */
  cop: [number, number, number];
  /** non-inertial position */
  x_NI: [number, number, number];
  /** non-inertial velocity */
  v_NI: [number, number, number];
  /** inertial position */
  x_I: [number, number, number];
  /** inertial velocity */
  v_I: [number, number, number];
  /** reference frames (inertial, non-inertial, guidance) */
  frames: [string, string, string];
  /** quaternion to convert from non-inertial frame to inertial frame */
  qt_IE: [number, number, number, number];
  /** quaternion to convert from inertial frame to body frame */
  qt_BI: [number, number, number, number];
  /** quaternion to convert from inertial frame to local frame (ENU) */
  qt_LI: [number, number, number, number];
  /** quaternion to convert from inertial frame to guidance frame (usually ENU, but is dynamic) */
  qt_GI: [number, number, number, number];
  /** acceleration */
  a: number;
  /** acceleration minus gravity contribution */
  accMinusG: number;
  /** angular velocity */
  w: [number, number, number];
  /** angular acceleration */
  alpha: [number, number, number];
  /** thrust */
  ts: number;
  /** specific impulse */
  isp: number;
  /** throttle percentage */
  tl: number[];
  /** thrust vector for each engine */
  tvc_engine: number[][];
  /** PID values for the TVC controllers */
  tvc_pid: number[];
  /** PID values for the RCS controllers */
  rcs_pid: number[];
  /** torque */
  tq: number[];
  /** aerodynamic pressure */
  q: number;
  /** drag coefficient */
  cd: number;
  /** lift coefficient */
  cl: number;
  /** delta-v remaining */
  dv: number;
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
