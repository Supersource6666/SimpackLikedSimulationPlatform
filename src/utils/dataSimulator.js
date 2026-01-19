// Data simulation utility for wheel-rail contact analysis
// Generates realistic simulated data for testing purposes

export const dataSimulator = {
  // Generate wheel load reduction data
  generateWheelLoadReductionData(mileage) {
    const baseValue = 0.1;
    const amplitude = 0.08;
    const frequency = 0.005;
    const noise = (Math.random() - 0.5) * 0.02;
    
    // Create realistic variation based on mileage
    const leftReductionRate = baseValue + 
      amplitude * Math.sin(frequency * mileage) + 
      noise + 
      (mileage % 1000 > 500 ? 0.03 : 0);
    
    const rightReductionRate = baseValue + 
      amplitude * Math.sin(frequency * mileage + Math.PI / 4) + 
      (Math.random() - 0.5) * 0.02 + 
      (mileage % 1200 > 600 ? 0.02 : 0);
    
    return {
      mileage,
      leftReductionRate: Math.max(0, Math.min(0.5, leftReductionRate)),
      rightReductionRate: Math.max(0, Math.min(0.5, rightReductionRate))
    };
  },

  // Generate derailment coefficient data
  generateDerailmentCoefficientData(mileage) {
    const baseValue = 0.2;
    const amplitude = 0.15;
    const frequency = 0.003;
    const noise = (Math.random() - 0.5) * 0.03;
    
    // Create realistic variation based on mileage
    const leftCoefficient = baseValue + 
      amplitude * Math.sin(frequency * mileage) + 
      noise + 
      (mileage % 800 > 400 ? 0.05 : 0);
    
    const rightCoefficient = baseValue + 
      amplitude * Math.sin(frequency * mileage + Math.PI / 3) + 
      (Math.random() - 0.5) * 0.03 + 
      (mileage % 900 > 450 ? 0.04 : 0);
    
    return {
      mileage,
      leftCoefficient: Math.max(0, Math.min(1.0, leftCoefficient)),
      rightCoefficient: Math.max(0, Math.min(1.0, rightCoefficient))
    };
  },

  // Generate wheel-rail force data
  generateWheelRailForceData(mileage) {
    const baseVertical = 100;
    const baseLateral = 20;
    const baseLongitudinal = 10;
    
    const verticalAmplitude = 30;
    const lateralAmplitude = 15;
    const longitudinalAmplitude = 8;
    
    const frequency = 0.004;
    const noise = (Math.random() - 0.5) * 5;
    
    // Create realistic variation based on mileage
    const verticalForce = baseVertical + 
      verticalAmplitude * Math.sin(frequency * mileage) + 
      noise + 
      (mileage % 1500 > 750 ? 20 : 0);
    
    const lateralForce = baseLateral + 
      lateralAmplitude * Math.sin(frequency * mileage + Math.PI / 4) + 
      (Math.random() - 0.5) * 3 + 
      (mileage % 1200 > 600 ? 10 : 0);
    
    const longitudinalForce = baseLongitudinal + 
      longitudinalAmplitude * Math.sin(frequency * mileage + Math.PI / 2) + 
      (Math.random() - 0.5) * 2 + 
      (mileage % 1000 > 500 ? 5 : 0);
    
    return {
      mileage,
      verticalForce: Math.max(50, verticalForce),
      lateralForce: Math.max(0, lateralForce),
      longitudinalForce: Math.max(0, longitudinalForce)
    };
  },

  // Generate speed data
  generateSpeedData(mileage) {
    const baseSpeed = 80; // Base speed in km/h
    const maxSpeed = 120; // Maximum speed in km/h
    const minSpeed = 60; // Minimum speed in km/h
    
    // Create realistic speed variations based on mileage
    // Simulate acceleration and deceleration patterns
    let speedVariation = 0;
    
    // Acceleration phase (0-3000m)
    if (mileage < 3000) {
      speedVariation = (maxSpeed - baseSpeed) * (mileage / 3000);
    }
    // Cruising phase (3000-7000m)
    else if (mileage < 7000) {
      speedVariation = (maxSpeed - baseSpeed) + Math.sin(mileage * 0.001) * 5;
    }
    // Deceleration phase (7000-10000m)
    else {
      speedVariation = (maxSpeed - baseSpeed) * (1 - (mileage - 7000) / 3000);
    }
    
    // Add some random noise
    const noise = (Math.random() - 0.5) * 3;
    
    const speed = baseSpeed + speedVariation + noise;
    
    return {
      mileage,
      speed: Math.max(minSpeed, Math.min(maxSpeed, speed))
    };
  },

  // Start simulating data with specified interval
  startSimulation(interval = 100, callbacks = {}) {
    let mileage = 0;
    const simulationInterval = setInterval(() => {
      mileage += 10; // Increment mileage by 10 meters each interval
      
      // Generate data for each type
      if (callbacks.onWheelLoadReduction) {
        const wheelLoadData = this.generateWheelLoadReductionData(mileage);
        callbacks.onWheelLoadReduction(wheelLoadData);
      }
      
      if (callbacks.onDerailmentCoefficient) {
        const derailmentData = this.generateDerailmentCoefficientData(mileage);
        callbacks.onDerailmentCoefficient(derailmentData);
      }
      
      if (callbacks.onWheelRailForce) {
        const wheelRailForceData = this.generateWheelRailForceData(mileage);
        callbacks.onWheelRailForce(wheelRailForceData);
      }
      
      if (callbacks.onSpeed) {
        const speedData = this.generateSpeedData(mileage);
        callbacks.onSpeed(speedData);
      }
      
      // Reset mileage after 10000 meters to create a loop
      if (mileage >= 10000) {
        mileage = 0;
      }
    }, interval);
    
    return simulationInterval;
  },

  // Stop simulation
  stopSimulation(intervalId) {
    if (intervalId) {
      clearInterval(intervalId);
    }
  }
};
