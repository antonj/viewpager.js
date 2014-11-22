/*global Scroller, setTimeout, requestAnimationFrame*/

var box = document.getElementById('box');
var area = document.getElementById('area');

var w = area.offsetWidth;
var h = area.offsetHeight;
console.log(w, h);

var scroller = new Scroller();
var position = {x: 0, y: 0};
scroller.startScroll(0, 0, w, h, 6000);

setTimeout(function () {
  scroller.fling(scroller.getCurrX(), scroller.getCurrY(), // startx, starty
                 1200, 500, //velocityX, velocityY,
                 0, w, //minX, maxX,
                 0, h); //minY, maxY);
}, 1000);

setTimeout(function () {
  scroller.fling(scroller.getCurrX(), scroller.getCurrY(), // startx, starty
                 200, 500, //velocityX, velocityY,
                 0, w, //minX, maxX,
                 0, h); //minY, maxY);
}, 2000);

function update() {
  var animating = scroller.computeScrollOffset();
  // console.log(animating,
  //             scroller.getCurrX(),
  //             scroller.getCurrY());
  if (!scroller.isFinished()) {
    position.x = scroller.getCurrX();
    position.y = scroller.getCurrY();
  }
  
  box.style['-webkit-transform'] = 'translate3d('
    + position.x + 'px, '
    + position.y + 'px, '
    + ' 0px)';
  // if (animating) {
  requestAnimationFrame(update);
  // }
};

requestAnimationFrame(update);

function mouseListener() {
  var m_down = false;
  var m_prev_point = {x: 0, y: 0, timestamp: 0};
  var m_dx = 0;
  var m_dy = 0;
  var m_dt = 0;
  
  var events = {
    handleEvent : function (event) {
      switch (event.type) {
      case 'mousedown':
      case 'touchstart':
        this.onDown(event);
        break;
      case 'mousemove':
      case 'touchmove':
        this.onMove(event);
        break;
      case 'mouseup':
      case 'touchend':
        this.onUp(event);
        break;
      }
    },

    onDown : function (e) {
      m_down = true;
      scroller.forceFinished(true);
    },
    onMove : function (e) {
      e.preventDefault();
      if (m_down) {
        var p = ('ontouchstart' in window)
              ? {x : e.touches[0].pageX, y : e.touches[0].pageY, timestamp : e.timeStamp}
            : {x : e.pageX, y : e.pageY, timestamp : e.timeStamp};
        position.x = p.x;
        position.y = p.y;
        m_dx = p.x - m_prev_point.x;
        m_dy = p.y - m_prev_point.y;
        m_dt = (p.timestamp - m_prev_point.timestamp) / 1000;
        m_prev_point = p;
      }
    },
    onUp : function (e) {
      m_down = false;

      console.log(m_dt, m_dx, m_dy, e);
      fling(m_dx / m_dt, m_dy / m_dt); // pixels / second
    }
  };

  function fling(vx, vy) {
    scroller.fling(position.x, position.y, // startx, starty
                   vx, vy, //velocityX, velocityY,
                   0, w, //minX, maxX,
                   0, h); //minY, maxY);
  }

  area.addEventListener('mousedown', events);
  area.addEventListener('mousemove', events);
  area.addEventListener('mouseup', events);
  area.addEventListener('touchstart', events);
  area.addEventListener('touchmove', events);
  area.addEventListener('touchend', events);
}

mouseListener();
