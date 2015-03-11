# viewpager.js

```js
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
```
