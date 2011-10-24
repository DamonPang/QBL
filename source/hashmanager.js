(function(NS){
	var win = window,
		location = win.location,
		// onhashchange事件是否可用
		HASH_EVENT_ENABLE = ('onhashchange' in win) && (!win.ActiveXObject || document.documentMode >= 8),
		
		// 辅助iframe的src
		// IFRAME_SRC = 'hashchange_util.html',
		
		// defHash存储第一次add之前的默认hash值
		defHash,
		
		// 用户存储历史hash的iframe
		_historyIFrame,
		
		// hash变化的响应事件
		_changeHandler = function(){},
		
		// 标识hash修改响应事件是否设置
		_hashMonitorRunning = false,
		
		// domain字符串
		_docDomainStr = (document.domain == location.host) ? '' : 'document.domain=\'' + document.domain + '\';';
		
		// IE版本号(未考虑IE9)
		vie = 8 - (window.XDomainRequest ? 0 : 1) - (window.XMLHttpRequest ? 0 : 1);
		
	/**
	 * 创建存储hash历史的iframe
	 */
	function _crtHistoryIFrame(){
		// 支持onhashchange事件时不需要执行
		if ( HASH_EVENT_ENABLE ){
			return;
		}
		var htmlTpl = '<html><head><script>'+ _docDomainStr +'window.onload=frameElement.init;</script></head><body></body></html>';
		
		// 存一下用iframe存储hash 历史之前的hash值
		defHash = location.hash || '';
		_historyIFrame = document.createElement('iframe');
		_historyIFrame.style.display = 'none';
		_historyIFrame.hasLoaded = false;
		
		document.body.appendChild(_historyIFrame);
		
		if ( !(vie == 6) ) {
			_historyIFrame.src = 'javascript:"'+ htmlTpl +'"';
		} else {
			//_historyIFrame.src = IFRAME_SRC;
			_historyIFrame.src = 'javascript:(function(){document.open();'+ _docDomainStr +'document.write("'+ htmlTpl +'");document.close();})();';
		}
		
		//_historyIFrame.src = 'javascript:(function(){document.open();document.domain="qq.com";document.write("<html><head><script>'+ _docDomainStr +'window.onload=frameElement.init;</script></head><body></body></html>");document.close();})();';
		
		
		// 前进后退更新iframe内容后执行的回调函数，用来更改主页面的hash值，不直接调用的
		_historyIFrame.changeParentHash = function(hash){
			if ( hash === 0 ){
				location.hash = defHash;
				return;
			}
			location.hash = hash || '';
		};
		//document.body.appendChild(_historyIFrame);
		
		return _historyIFrame;
	}
	
	/**
	 * 重写iframe内容(用来为IE6 7生成历史记录)， 并更新父窗口的hash值
	 * @param {HTMLElement} frame 记录历史的iframe dom元素
	 * @param {string} hash 更改的hash字符串
	 */
	function _rwIFrame(frame, hash){
		var doc = frame.contentWindow.document;
		doc.open('text/html');
		doc.write('<html><head><script>'+ _docDomainStr +';frameElement.changeParentHash(\'' + hash +'\');<\/script></head><body></body></html>');
		doc.close();
	};
	
	/**
	 * 取得hash字符串转换为json后的结果
	 * @param {string} [hashStr] 要转为json的hash字符串(不带“#”)， 不传则从window.loaction中取
	 */
	function _genHashJson(hashStr){
		var json = {}, hashArr, t, i, len;
		
		hashStr = (typeof hashStr == 'undefined') ? location.hash.slice(1) : hashStr;
		hashArr = hashStr.split('&');
		len = hashArr.length;
		
		if ( hashStr !== '' ){
			for ( i = 0; i < len; i++ ) {
				t = hashArr[i].split('=');
				
				if (t.length > 0) {
					json[t[0]] = t.slice(1).join('=') || '';
				}
			}
		}
		return json;
	}
	
	/**
	 * 生成json转化为字符串的结果
	 * @param {object} json 要转化为字符串的json对象
	 */
	function _genHashStr(json){
		var hashArr = [], v;
	
		for (k in json) {
			v = json[k];
			hashArr.push( !!v ? ( k + '=' + v ) : k );
		}
		
		return hashArr.join('&');
	}
	
	/**
	 * 设置完整的hash值
	 * @param {string} [hash] 要设置的hash字符串
	 */
	function setHash(hash){
		var hf;
		
		hash = hash || '';
		
		// 如果hashMonitor没有跑起来，设置hash时把_changeHandler作为响应handler。
		// 可通过hashManager.setChangeHandler来设置_changeHandler。这样用可以避免页面初始化的
		// 时候就跑定时器，缺点是在第一次调用set函数之前，修改hash没有响应函数
		if ( !_hashMonitorRunning ) {
			_changeHandler && runMonitor(_changeHandler);
		}
		
		// 有onhashchange事件可用时，直接修改hash值即可
		if ( HASH_EVENT_ENABLE ){
			// location.hash = '#' + hash;	// 到底要不要加"#", 目前看起来是没啥差别
			location.hash = hash;
		} else {
			if ( !_historyIFrame ) {
				hf = _crtHistoryIFrame();
				// 创建iframe设置src的和浏览器back到第一条历史记录时会调用init
				hf.init = function(){
					if ( hf.hasLoaded ){
						hf.changeParentHash(0);
						return;
					}
					_rwIFrame(hf, hash);
					hf.hasLoaded = true;
				};
			} else {
				_rwIFrame(_historyIFrame, hash);
			}
		}
	}
		
	/**
	 * 设置hash值，根据传参数的方式不同设置的内容有差别
	 * @param {string|object} param1 要设置的hash根据类型不同意义不同
	 * @param {string} [value] 若设置key=value形势的hash值，这里就是value
	 */
	function set(param1, value){
		var tk = typeof param1, 
			tv = typeof value;
		
		switch (tk) {
			case 'string' :
				// string 和 number为合法的value,调用setParam. 不合法的value无视之
				(tv === 'string' || tv === 'number') ? setParam(param1, value) : setHash(param1);
				break;
			case 'object' :
				setHash(_genHashStr(param1));
				break;
			case 'undefined' :
				setHash();
				break;
		}
	};
	
	
	/**
	 * 设置"key=value"字符串形式的hash值
	 * @description 没有设置则添加，有设置过则覆写
	 * @param {string} key
	 * @param {string} [val]
	 */
	function setParam(key, val){
		var hashJson = _genHashJson();
		
		hashJson[key] = val;
		
		setHash( _genHashStr(hashJson) );
		
		return location.hash;
	}
	
	
	/**
	 * 删除hash中指定 key/value 对
	 * @param {string} key
	 */
	function delParam(key){
		var hashJson = _genHashJson();
		if ( hashJson[key] != undefined ) {
			delete hashJson[key];
			setHash( _genHashStr(hashJson) );
		}

		return location.hash;
	}
	
	/**
	 * 获取hash中指定 key 的值
	 * @param {string} key
	 */
	function getParam(key){
		return _genHashJson()[key];
	}

	/**
	 * 检测hash变化并执行回调
	 * @param {function} callback 检测hash变化后的回调函数，传入当前hash值的json对象为arguments[0]
	 */
	function runMonitor(callback){
		
		if ( _hashMonitorRunning ){
			return;
		}
		
		var hash = location.hash,
			changeMonitor = function(){
				var curHash = location.hash;
				if ( curHash != hash ) {
					hash = curHash;
					(typeof callback === 'function') && callback(_genHashJson());
				}
			};
		
		// 设置hashchange时的响应事件。IE6,7依赖定时器，标准浏览器支持onhashchange事件响应
		if (HASH_EVENT_ENABLE) {
			window.onhashchange = changeMonitor;
		} else {
			setInterval(changeMonitor, 200);	// 拍脑袋的数值，听说大部分人的反应时间为0.2秒  :D
		}
		
		_hashMonitorRunning = true;
	}
	
	/**
	 * 设置hash变更时候的响应事件。
	 * @description 必须在调用过set后才起作用。用在不想页面初始化就跑个定时器检测hash响应的场景下
	 */
	function setChangeHandler(callback){
		_changeHandler = callback;
	}


	/**
	 * 抛给对外调用的接口, NS为闭包函数传入的命名空间
	 */
	// 启动定时器，检测hash变更并设置onhashchange的回调函数
	NS['runMonitor'] = runMonitor;
	
	// 设置监测hashchange的回调函数，在第一次set 或 setParam是才启动定时器。避免默认全局跑定时器，有功能缺失。
	NS['setChangeHandler'] = setChangeHandler;
	
	// 设置hash值， example: set('fullhash')、 set('liyi', 'coder')、 set({liyi:1, leihuan:2});
	NS['set'] = set;
	
	// 获取json格式的hash值(如果hash字符串是"&"分割的)
	NS['get'] = _genHashJson;
	
	// 设置"key=value"形式的hash参数
	NS['setParam'] = setParam;
	
	// 取得和删除指定key的hash参数(如果hash是"&"分割的)
	NS['getParam'] = getParam;
	NS['delParam'] = delParam;
	
})(QBL.hashManager = {});
