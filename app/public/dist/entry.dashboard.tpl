<!doctype html><html class="dark"><head><title>{{name}}</title><link href="/static/normalize.css" rel="stylesheet"><link href="/static/logo.png" rel="icon" type="image/x-icon"><script defer="defer" src="/dist/prod/js/vendor_87a3c016.bundle.js" crossorigin="anonymous"></script><script defer="defer" src="/dist/prod/js/common_033f06d1.bundle.js" crossorigin="anonymous"></script><script defer="defer" src="/dist/prod/js/entry.dashboard_4143dc2e.bundle.js" crossorigin="anonymous"></script><link href="/dist/prod/vendor.css" rel="stylesheet" crossorigin="anonymous"><link href="/dist/prod/entry.dashboard.css" rel="stylesheet" crossorigin="anonymous"></head><body style="margin:0"><div id="root"></div><input id="projKey" value="{{ projKey}}" style="display:none;"/> <input id="env" value="{{env}}" style="display:none;"/> <input id="options" value="{{options}}" style="display:none;"/></body><script src="https://cdn.bootcss.com/axios/0.18.0/axios.min.js"></script><script src="https://cdn.bootcdn.net/ajax/libs/blueimp-md5/2.19.0/js/md5.js"></script><script>try{
   window.projKey = document.getElementById('projKey').value
    window.env = document.getElementById('env').value
    const options = document.getElementById('options').value
    window.options = JSON.parse(options)
 } catch(e){
    console.log(e)
 }</script></html>