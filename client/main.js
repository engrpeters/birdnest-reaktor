import { Pilots } from '../both/collection';
import d3 from 'd3'

import './main.html'


Template.violations.helpers({
    name(first,last){
        return first + ' ' + last
    },
    dist(distance,ins){
        return distance.toPrecision(4)
    },
    pilots(){
         return Pilots.find({ 'drone.NDZtimestamp' : {
          $gt: new Date(new Date().getTime() - 1000 * 60 * 10)}},{limit:25,sort:{'drone.NDZtimestamp':-1}}).fetch()
    }
})

Template.violations.onRendered(()=>{

    Tracker.autorun(()=>{

        var data = [
          {x: 250, 
          y: 250,
          firstName:"Bird",
          lastName: "Nest", 
          drone: {serialNumber:"N/A"}},
          ...Pilots.find({ 'drone.NDZtimestamp' : {
          $gt: new Date(new Date().getTime() - 1000 * 60 * 10)}}).fetch()].map((el,ind)=>{
            return {
                x:el.drone.positionX/1000,
                y:el.drone.positionY/1000,
                ...el
            }
        })

          // Use d3.js to select the SVG element and bind the data to it
          var svg = d3.select("svg");

          
          var circles = svg.selectAll("circle")
            .data(data)
            .enter()
            .append("circle");

          // Use d3.js to create visual elements that represent the drone positions
          circles.attr("cx", function(d) { return d.x; });
          circles.attr("cy", function(d) { return d.y; });
          circles.attr("r", 2.5);
        
          // Use d3.js to add interactivity to the visualization

          circles.filter(function(d) { return d.lastName === "Nest"; }).style("fill", "blue");
          circles.filter(function(d) { return d.lastName !== "Nest"; }).style("fill", "black");

          circles.on("mouseover", function(ev,d) {
            d3.select(this).style("fill", "red");
            document.getElementById("tooltip").innerHTML = "Pilot: " + d.firstName + " " + d.lastName + "<br>" + "Drone: " + d.drone.serialNumber + "<br> Location (x,y): "+ d.x.toFixed(2) + ", " + d.y.toFixed(2) ;
        
        });


          circles.on("mouseout", function(ev,d) {
            document.getElementById("tooltip").innerHTML = "";        
            if(d.x === 250 && d.y === 250){
               return d3.select(this).style("fill", "blue");
            }

            d3.select(this).style("fill", "black");
          });
        })
})
