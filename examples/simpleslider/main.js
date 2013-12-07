/*global ViewPager*/

var item_container = document.querySelector('.pager_items');
var view_pager_elem = document.querySelector('.pager');
var w = view_pager_elem.offsetWidth;
var h = view_pager_elem.offsetHeight;

var vp = new ViewPager(view_pager_elem, {
  pages: item_container.children.length,
  vertical: false,
  onPageScroll : function (offset, page) {
    console.log(offset, page);
    item_container.style['-webkit-transform'] = 'translate3d(' + ((-offset * w) - (page * w)) + 'px, 0px, 0px)';

  },

  onPageChange : function (page) {
    console.log('page', page);
  },

  onSizeChanged : function(width, height) {
    w = width;
  }
});

document.getElementById('prev').addEventListener('click', function () {
  vp.previous();
});
document.getElementById('next').addEventListener('click', function () {
  vp.next();
});
