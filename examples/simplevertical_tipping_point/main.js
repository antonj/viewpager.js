/*global ViewPager*/

var item_container = document.querySelector('.pager_items');
var view_pager_elem = document.querySelector('.pager');
var w = view_pager_elem.offsetWidth;
var h = view_pager_elem.offsetHeight;

var vp = new ViewPager(view_pager_elem, {
  pages: item_container.children.length,
  vertical: true,
  tipping_point: 0.2, // only move 0.2 from start to trigger change if released
  onPageScroll : function (offset, page) {
    console.log(offset, page);
    item_container.style['-webkit-transform'] = 'translate3d(0px, ' + ((-offset * h) - (page * h)) + 'px, 0px)';

  },

  onPageChange : function (page) {
    console.log('page', page);
  },

  onSizeChanged : function(width, height) {
    w = width;
  }
});

// document.getElementById('prev').addEventListener('click', function () {
//   vp.previous();
// });
// document.getElementById('next').addEventListener('click', function () {
//   vp.next();
// });

// To enable touch events on desktop.
// Note: Remove this when building Cordova/PhoneGap apps!
var isMobileUA = function () {
    return navigator.userAgent.match(/Android/i)
      || navigator.userAgent.match(/webOS/i)
      || navigator.userAgent.match(/iPhone/i)
      || navigator.userAgent.match(/iPad/i)
      || navigator.userAgent.match(/iPod/i)
      || navigator.userAgent.match(/BlackBerry/i)
      || navigator.userAgent.match(/Windows Phone/i)
    ? true
    : false;
};
if (!isMobileUA()) {
    console.log('No mobile user agent detected; initiating Fingerblast.js.')
    window.onload = new FingerBlast(view_pager_elem);
}
