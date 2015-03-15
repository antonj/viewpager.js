# viewpager.js

## Basic usage
```js
...
var  w = view_pager_elem.getBoundingClientRect().width;

var vp = new ViewPager(view_pager_elem, {
  pages: item_container.children.length,
  onPageScroll : function (scrollInfo) {
    offset = -scrollInfo.totalOffset;
    item_container.style['-webkit-transform'] = 'translate3d(' + (-scrollInfo.totalOffset * w) + 'px, 0px, 0px)';
  },

  onPageChange : function (page) {
    console.log('page', page);
  }
});
```
