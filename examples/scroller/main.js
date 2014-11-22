/*global Scroller, requestAnimationFrame*/

var box = document.getElementById('box');
var area = document.getElementById('area');

var w = area.offsetWidth;
var h = area.offsetHeight;
console.log(w, h);

var scroller = new Scroller();
scroller.startScroll(0, 0, w, h, 2000);

function update() {
  var animating = scroller.computeScrollOffset();
  console.log(animating,
              scroller.getCurrX(),
              scroller.getCurrY());
  box.style['-webkit-transform'] = 'translate3d('
    + scroller.getCurrX() + 'px, '
    + scroller.getCurrY() + 'px, '
    + ' 0px)';
  if (animating) {
    requestAnimationFrame(update);
  }
};

requestAnimationFrame(update);
