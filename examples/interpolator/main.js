/*global ViewPager*/

var item_container = document.querySelector('.pager_items');
var view_pager_elem = document.querySelector('.pager');
var  w = view_pager_elem.offsetWidth;

var vp = new ViewPager(view_pager_elem, {
  pages: item_container.children.length,
  vertical: false,
  onPageScroll : function (totalOffset, page, pageOffset) {
    item_container.style['-webkit-transform'] = 'translate3d(' + (totalOffset * w) + 'px, 0px, 0px)';
  },

  onPageChange : function (page) {
    console.log('page', page);
  }
});

var interpolators = {
  overshoot : function(t) {
    var tension = 0.95;
    t -= 1.0;
    return t * t * ((tension + 1) * t + tension) + 1.0;
  },

  backout : function ( k ) {
    var s = 1.70158;
    return --k * k * ( ( s + 1 ) * k + s ) + 1;
  },

  bounceout : function ( k ) {
    if ( k < ( 1 / 2.75 ) ) {
      return 7.5625 * k * k;
    } else if ( k < ( 2 / 2.75 ) ) {
      return 7.5625 * ( k -= ( 1.5 / 2.75 ) ) * k + 0.75;
    } else if ( k < ( 2.5 / 2.75 ) ) {
      return 7.5625 * ( k -= ( 2.25 / 2.75 ) ) * k + 0.9375;
    } else {
      return 7.5625 * ( k -= ( 2.625 / 2.75 ) ) * k + 0.984375;
    }
  }
};

document.getElementById('btn-prev').addEventListener('click', function () {
  vp.previous(500, interpolators.bounceout);
});
document.getElementById('btn-next').addEventListener('click', function () {
  vp.next(1000, interpolators.overshoot);
});
