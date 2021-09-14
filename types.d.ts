export interface Mission {
  mission: {
    code: string;
    description: string;
    datetime: string;
    [key: string]: any;
  };
  data: {
    eventLog: {
      key: string;
      value: string;
    }[];
    stageTrajectories: {
      stageNumber: number;
      telemetry: {
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
      }[];
    }[];
  };
  [key: string]: any;
}

export interface MissionEventSummary {
  name: string;
  latitude: number;
  longitude: number;
  altitude: number;
}
