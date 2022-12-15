import { Meteor } from 'meteor/meteor';
import { Pilots } from '../both/collection';

Meteor.startup(() => {
  // code to run on server at startup

  Pilots.rawCollection().createIndex({'drone.NDZtimestamp':1},{expireAfterSeconds:600000})

 // Pilots.remove({})
  setInterval(Meteor.bindEnvironment(updatePilots),2000)

});


var parseXML = require('xml-js').xml2js
const pilots = Pilots;
const nestCoor = {
  x: 250000,
  y: 250000,
};

// The radius of the no-fly zone (100 meters)
const radius = 100;

// The maximum age of the drone positions to consider (10 minutes)
const maxAge = 10 * 60 * 1000;



function distance(a, b) {
  
  return Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2)) / 1000;
}


function updatePilots() {
  // Retrieve the list of drones from the monitoring equipment
  HTTP.get('http://assignments.reaktor.com/birdnest/drones', (error, result) => {
    if (error) {
      // Handle the error
      console.error(error);
    } else {
      // Parse the XML response
      const snapShot = parseXML(result.content,{compact:true});
      //console.log(snapShot.report.capture.drone)
      const drones = snapShot.report.capture.drone.map(
        (drone,index) => {
          return {
            serialNumber: drone.serialNumber['_text'],
            model: drone.model['_text'],
            manufacturer: drone.manufacturer['_text'],
            positionX: parseFloat(drone.positionX['_text']),
            positionY: parseFloat(drone.positionY['_text']),
            altitude: parseFloat(drone.altitude['_text']),
            timestamp: new Date(
              snapShot.report.capture['_attributes']['snapshotTimestamp']
            ),
            NDZtimestamp:
              distance({
                x: parseFloat(drone.positionX['_text']),
                y: parseFloat(drone.positionY['_text']),
              },nestCoor) <= 100
                ? new Date(
                    snapShot.report.capture['_attributes'][
                      'snapshotTimestamp']
                  )
                : null,
            distance: distance({
              x: parseFloat(drone.positionX['_text']),
              y: parseFloat(drone.positionY['_text']),
            },nestCoor),
          };
        }
      );
    
      // Filter the drones that are within the NDZ and haven't been seen in the last 10 minutes
      const recentViolations = drones
        .filter(d => distance({x:d.positionX,y:d.positionY}, nestCoor) <= radius)
        .filter(d => moment(d.timestamp).isAfter(moment().subtract(maxAge, 'ms')));

    //    console.log(recentViolations)
      // Fetch the pilots' information for the recent violations
      recentViolations.forEach(d => {
        HTTP.get(`http://assignments.reaktor.com/birdnest/pilots/${d.serialNumber}`, (error, result) => {
          if (error) {
            // Handle the error
            console.error(error);
          } else {
            // Parse the JSON response
            const pilot = JSON.parse(result.content);

            pilot.drone = d
console.log(pilot)
            // Update the pilot information with the distance from the nest
            pilot.distance = distance({x:d.positionX,y:d.positionY}, nestCoor);

            // Add the pilot to the list of pilots
            pilots.upsert({pilotId:pilot.pilotId},pilot);
            
           
          }
        });
      });

  
    }
 
  });
}
updatePilots()