/*global ViewPager*/

var interpolators = {
  overshoot : function(k) {
    var tension = 0.95;
    k -= 1.0;
    return k * k * ((tension + 1) * k + tension) + 1.0;
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
  },

  elasticout : function ( k ) {
    var s, a = 0.1, p = 0.4;
    if ( k === 0 ) return 0;
    if ( k === 1 ) return 1;
    if ( !a || a < 1 ) { a = 1; s = p / 4; }
    else s = p * Math.asin( 1 / a ) / ( 2 * Math.PI );
    return ( a * Math.pow( 2, - 10 * k) * Math.sin( ( k - s ) * ( 2 * Math.PI ) / p ) + 1 );
  }
};

var item_container = document.querySelector('.pager_items');
var view_pager_elem = document.querySelector('.pager');
var  w = view_pager_elem.offsetWidth;

var vp = new ViewPager(view_pager_elem, {
  pages: item_container.children.length,
  anim_duration : 300, // Default anim time
  interpolator : interpolators.overshoot, // default interpolator
  vertical: false,
  onPageScroll : function (totalOffset, page, pageOffset, animoffset) {
    // console.log('anim offset', animoffset);
    item_container.style['-webkit-transform'] = 'translate3d(' + (totalOffset * w) + 'px, 0px, 0px)';
  },

  onPageChange : function (page) {
    console.log('page', page);
  }
});

document.getElementById('btn-prev').addEventListener('click', function () {
  vp.previous(500, interpolators.bounceout);
});
document.getElementById('btn-next').addEventListener('click', function () {
  vp.next(1000, interpolators.elasticout);
});

vp.goToIndex(4, 2000, interpolators.backout);
