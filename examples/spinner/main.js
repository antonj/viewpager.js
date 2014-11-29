/*global Scroller, GestureDetector, VelocityTracker, setTimeout, requestAnimationFrame*/

var MINIMUM_FLING_VELOCITY = 50;

var box = document.getElementById('box');
var area = document.getElementById('area');
var canvas = document.getElementById('canvas');
var context = canvas.getContext('2d');

var w = area.offsetWidth;
var h = area.offsetHeight;
var cx = w / 2;
var cy = h / 2;
canvas.width = w;
canvas.height = h;
context.font = "44px Helvetica";
context.textAlign = "center";

console.log(w, h);

var scroller = new Scroller();
var position = {x: 0, y: 0};

var STEPS = w / 16;

function clamp (val, min, max) {
  return Math.min(Math.max(val, min), max);
};

function roundTo (i, v) {
  return Math.round(i / v) * v;
};

var active = false;
var gd = new GestureDetector(area, {
  onFirstDrag : function (p) {
    active =  Math.abs(p.dx) > Math.abs(p.dy);
    if (active) {
      p.event.preventDefault();
    }
  },
  
  onDrag : function (p) {
    if (!active) return;
    scroller.forceFinished(true);
    console.log('dx', p.dx);
    position.x += p.dx;
  },

  onFling : function (p, v) {
    if (!active) return;
    console.log('fling', p, v);
    if (Math.abs(v.vx) === 0) {
      var pos = roundTo(position.x, STEPS);
      scroller.startScroll(position.x, 0,
                           pos - position.x, 0,
                           200);
      console.log('SCROLL', position.x, pos);
    } else {
      scroller.fling(position.x, position.y, // startx, starty
                     // vx, vy, //velocityX, velocityY,
                     v.vx * 1000, //velocityX
                     0); //velocityY
      var finalX = scroller.getFinalX();
      var roundedX = roundTo(finalX, STEPS);
      scroller.setFinalX(roundedX);
      console.log('FLING start, finish', finalX, roundedX);
    }
  }
});

var vtracker = gd.getVelocityTracker();

function update() {
  var animating = scroller.computeScrollOffset();

  if (animating) {
    var scrollX = scroller.getCurrX();
    scrollX = clamp(scrollX, 0, w);
    if (scrollX === 0 || scrollX === w) {
      scroller.forceFinished(true);
    }
  
    position.x = scrollX;
    console.log(position.x);
  }

  box.style['-webkit-transform'] = 'translate3d('
    + position.x + 'px, '
    + 0 + 'px, '
    + ' 0px)';

  var val = clamp(roundTo(position.x, STEPS) / (STEPS * 2), 0, 8);

  context.clearRect ( 0 , 0 , canvas.width, canvas.height );
  
  context.fillStyle = 'black';
  context.fillText("" + val.toFixed(1), cx, cy + 10);

  // draw grid
  var px = 1;
  var big = true;
  context.strokeStyle = 'grey';
  while (px <= w) {
    context.beginPath();
    context.moveTo(px, cy - (big ? 20 : 10));
    context.lineTo(px, cy + (big ? 20 : 10));
    context.stroke();
    context.closePath();
    px += STEPS;
    big = !big;
  }
  

  // Velo
  var v = vtracker.getVelocity();
  context.beginPath();
  context.moveTo(cx, cy);
  context.lineTo(cx + v.vx * 100,
                 cy + v.vy * 100);
  context.stroke();


  // if (animating) {
  requestAnimationFrame(update);
  // }
};

requestAnimationFrame(update);

// function mouseListener() {
//   var m_down = false;
//   var m_prev_point = {x: 0, y: 0, timestamp: 0};
//   var m_dx = 0;
//   var m_dy = 0;
//   var m_dt = 0;

//   var events = {
//     handleEvent : function (event) {
//       switch (event.type) {
//       case 'mousedown':
//       case 'touchstart':
//         this.onDown(event);
//         break;
//       case 'mousemove':
//       case 'touchmove':
//         this.onMove(event);
//         break;
//       case 'mouseup':
//       case 'touchend':
//         this.onUp(event);
//         break;
//       }
//     },

//     onDown : function (e) {
//       m_down = true;
//       scroller.forceFinished(true);
//     },
//     onMove : function (e) {
//       e.preventDefault();
//       if (m_down) {
//         var p = ('ontouchstart' in window)
//               ? {x : e.touches[0].pageX, y : e.touches[0].pageY, timestamp : e.timeStamp}
//             : {x : e.pageX, y : e.pageY, timestamp : e.timeStamp};
//         vtracker.addMovement(p);
//         position.x = p.x;
//         position.y = p.y;
//         m_dx = p.x - m_prev_point.x;
//         m_dy = p.y - m_prev_point.y;
//         m_dt = (p.timestamp - m_prev_point.timestamp) / 1000;
//         m_prev_point = p;
//       }
//     },
//     onUp : function (e) {
//       m_down = false;

//       console.log(m_dt, m_dx, m_dy, e);
//       fling(m_dx / m_dt, m_dy / m_dt); // pixels / second
//     }
//   };

//   function fling(vx, vy) {
//     if (Math.abs(vy) > MINIMUM_FLING_VELOCITY || Math.abs(vx) > MINIMUM_FLING_VELOCITY) {
//       var v = vtracker.getVelocity();
//       console.log("velo" , vtracker.getVelocity());
//       console.log("vx, vy" , vx, vy);
//       scroller.fling(position.x, position.y, // startx, starty
//                      // vx, vy, //velocityX, velocityY,
//                      v.vx * 1000, //velocityX
//                      v.vy * 1000); //velocityY
//     }
//   }

//   area.addEventListener('mousedown', events);
//   area.addEventListener('mousemove', events);
//   area.addEventListener('mouseup', events);
//   area.addEventListener('touchstart', events);
//   area.addEventListener('touchmove', events);
//   area.addEventListener('touchend', events);
// }

// mouseListener();
