/*global ViewPager*/

var item_container = document.querySelector('.pager_items');
var view_pager_elem = document.querySelector('.pager');
var  w = view_pager_elem.getBoundingClientRect().width;

var items = item_container.children.length;
item_container.style.width = (items * 100)+ '%';
var child_width = (100 / items) + '%';
for (var i = 0; i < items; i++) {
  item_container.children[i].style.width = child_width;
  item_container.children[i].innerHTML = "" + i + "";
}

var offset = 0;

var vp = new ViewPager(view_pager_elem, {
  pages: item_container.children.length,
  vertical: false,
  onPageScroll : function (scrollInfo) {
    console.log('onPageScroll', scrollInfo);
    offset = -scrollInfo.totalOffset;
    invalidateScroll();
  },

  onPageChange : function (page) {
    console.log('page', page);
  }
});

function invalidateScroll() {
  item_container.style['-webkit-transform'] = 'translate3d(' + (offset * w) + 'px, 0px, 0px)';
}

window.addEventListener('resize', function () {
  w = view_pager_elem.getBoundingClientRect().width;
  invalidateScroll();
});

document.getElementById('btn-prev').addEventListener('click', function () {
  vp.previous();
});
document.getElementById('btn-next').addEventListener('click', function () {
  vp.next();
});
