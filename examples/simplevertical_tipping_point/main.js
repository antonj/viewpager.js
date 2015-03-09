/*global ViewPager*/

var item_container = document.querySelector('.pager_items');
var view_pager_elem = document.querySelector('.pager');
var w = view_pager_elem.offsetWidth;
var h = view_pager_elem.offsetHeight;

var vp = new ViewPager(view_pager_elem, {
  pages: item_container.children.length,
  vertical: true,
  tipping_point: 0.2, // only move 0.2 from start to trigger change if released
  onPageScroll : function (totalOffset, activePage, pageOffset) {
    item_container.style['-webkit-transform'] = 'translate3d(0px, ' + (totalOffset * h) + 'px, 0px)';
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
