/**
 * @fileOverview	QBL	- Qzone Business Logic/Library 业务逻辑框架
 * @version			1.0.0
 */

/**
 * 主体功能：
	请求控制
	缓存控制
	存储控制
	立体监控
 * 按需加载组件：
	翻页
	日历
	图表
 */

/**
 最小的核心文件，core，用来：
	1. 包含基本功能，可直接完成某些简单业务
	2. 加载外部资源，甚至框架，完成复杂业务
 */

window.QBL = window.QBL || {};

(function(){
	var ptisp = QZFL.cookie.get('ptisp') + '.';  // TODO 这里去掉QZFL的依赖
	ptisp==='.' && (ptisp='');

	QBL.config = {
		version	: '1.0.0',
		domain	: location.host,
		siDomain: window.siDomain || parent.siDomain || ptisp +'qzonestyle.gtimg.cn',  // 加载静态资源的域名,cookie free
		imgcacheDomain: window.imgcacheDomain || parent.imgcacheDomain || ptisp +'qzs.qq.com'
	};

	// 本框架资源
	QBL.config.libDir = 'http://'+ QBL.config.siDomain +'/qzone/biz/qbl/';
})();

/**
 * 外部模块加载器，可以带有版本号
 * @example QBL.include(['QZFL', '2.0.8.4'], 'stat');
 */
QBL.include = function(){
	var n,  // 模块名
		v,  // 版本号
		mod,
		modules = Array.prototype.slice.call(arguments);  // 需要加载的模块

	for(var i=0, len=modules.length; i<len; i++){
		mod = modules[i];
		typeof mod==='string' ? (n=mod[i], v='') : (n=mod[i][0], v=mod[i][1]);

		QBL[n].prefetch(v);

		QBL[n].method();
	}
};

/**
 * QBL初始化完毕
 */
(function(){
	var cbpool = [];

	QBL.onReady = function(callback){
		// 必需的资源加载完后，执行
		typeof callback==='function' && cbpool.push(callback);
	};

	// 执行
	QBL.onReady._exec = function(){
		var fn;

		while(fn=cbpool.shift()) {
			fn();
		}
	};
})();

/**
 * 外部模块shell原型
 */
QBL.Mshell = function(mod, ver){
	this.name = mod;
	this.version = ver || null;
};
QBL.Mshell.prototype = {
	// 需要加载的资源列表
	resource: [],
	
	// 资源预加载
	prefetch: function(ver){
		var rs = this.resource,
			i = 0, len,
			url;

		for(len=rs.length; i<len; i++){
			url = rs[i];

			// 补全url
			url.substr(0,1)==='/' && (url='http://'+ QBL.config.siDomain + url);
			ver && (url = url.replace(/{VER}/g, ver) );

			if(! this.fetched) {
				QBL.Mshell.smartLoader(url);  // 识别类型，加载js、css、图片、swf等资源
			}
		}
	},
	
	// 将这些方法映射出来，支持预调用，等加载资源完成后才会真正执行
	method: function(){
		var i=0, len,
			meth = Array.prototype.slice.call(arguments);  // 加载完成后可提供的方法

		for(len=meth.length; i<len; i++){
			this[ meth[i] ] = QBL.Mshell.fshell(meth[i]);  // 接收参数的函数壳
		}
	},
	
	onReady: function(){
	
	}
};
QBL.Mshell.prototype.onReady._exec = function(){

};

/**
 * QBL回调函数，用于存储shell的参数用
 */
(function(M){
	var pool = {};

	M.fshell = function(method){
		!method in pool && (pool[method]=[]);

		return function(){
			var args = Array.prototype.slice.call(arguments);

			pool[method].push(args);
		};
	};

	M.fshell.exec = function(method){
		var m, fun, cnt=0;

		method in pool && (m=pool[method], cnt=m.length);

	};

	// 智能加载器
	M.smartLoader = function(url, callback){
		var suffix, loader,
			headEl = document.getElementsByTagName('head')[0];

		loader = {
			css: function(url){
				var cssEl = document.createElement('link');
				cssEl.rel = cssEl.rev = 'stylesheet';
				cssEl.type = 'text/css';
				headEl.insertBefore(cssEl, headEl.firstChild);
				cssEl.href = url;
			},
			js: function(url){
				var jsEl = document.createElement('script');
				isie = !!document.attachEvent;
				typeof callback==='function' && jsEl[isie ? 'attachEvent' : 'addEventListener'](isie?'onreadystatechange':'load', function(){
					if(isie && jsEl.readyState !== 'loaded'){
						return;
					}
					callback();
					jsEl = null;
				}, false);
				headEl.insertBefore(jsEl, headEl.firstChild);
				jsEl.src = url;
			},
			img: function(url, callback){
				var img = new Image;
				typeof callback==='function' && (img.onload = (function(t){
					return function(){
						callback();
					};
				})(img));
				img.src = url;
			}
		};

	};

})(QBL.Mshell);



// 大量外部脚本，需要注册到Mshell

/**
 * 框架加载
 */
QBL.QZFL = new QBL.Mshell('QZFL');
QBL.QZFL.resource = [
	'http://'+ QBL.config.siDomain +'/ac/qzone/qzfl/qzfl_{VER}.js',
	'http://'+ QBL.config.siDomain +'/qzonestyle/global/css/qzfl.css'
];
/**
 * QZFL的加载，需要自行实现
 */
QBL.QZFL.prefetch = function(ver){
	var _r = QBL.QZFL.resource,
		cssEl, jsEl, headEl,
		isie;

	if(! this.prefetched){
		// 没有指定版本号，则加载lite版
		ver ? _r[0] = _r[0].replace(/{VER}/g, ver) : (_r[0] = '/ac/qzfl/release/qzfl_lite.js');

		QBL.Mshell.smartLoader(_r[1]);
		QBL.Mshell.smartLoader(_r[0]);
	}
};

// 加载QZFL后的一些操作
QBL.QZFL.onReady(function(){
	// 替换掉当前简单的实现
//	QBL.Mshell.smartLoader;
});

/*
(function(){
	var _p = QBL.QZFL.prefetch;
	QBL.QZFL.prefetch = function(ver){
		// 没有指定版本号，则加载lite版
		!ver && (QBL.QZFL.resource[0] = '/ac/qzfl/release/qzfl_lite.js');
		_p(ver);
	}
})();
*/
QBL.QZFL.method('JSONGetter', 'FormSender');  // 这里的方法要抛到window下

/**
 * 统计库
 */
QBL.stat = new QBL.Mshell('stat');
QBL.stat.resource = [
	'/ac/qzfl/stat.js'
];
QBL.stat.method('monitorCgi', 'monitorPage', 'monitorPV', 'monitorClick');




/**
 * 基本常用功能
 */





