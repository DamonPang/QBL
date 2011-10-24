/**
 * @fileOverview	stat.js 统计上报，包含返回码、测速、pvuv、hotClick点击统计
 * @author			damonpeng
 * @version			1.0.0
 */
(function(M){
	// 实例的管理
	var instance = {
			_pool: {},  // 存储

			_current: null,  // 当前的instance，当不传或无法获取时的返回

			get: function(iname){
				typeof iname==='undefined' && (iname = this._current);

				return this._pool[iname];
			},
			
			set: function(ist, iname){
				typeof iname==='undefined' && (iname = this._current);

				this._pool[iname] = ist;

				return this._current = iname;
			},
			
			destory: function(iname){
				if(iname && iname in this._pool){
					this._pool[iname] = null;
					delete this._pool[iname];
				}
			}
		},
		
		// 上报
		reporter;

	reporter = {
		init: function(){
			return window.TCISD;
		},

		// 上报
		send: function(callback, args){
			var cmp = this.init();

			if(!cmp){
				QZFL.imports('http://'+ QBL.config.siDomain +'/ac/qzfl/stat.js', function(){
					(reporter.init())[callback].apply(null, args);
				}, {charset: 'utf-8'});

				return;
			} else {
				return cmp[callback].apply(null, args);
			}
		},
		
		// 返回码统计
		valueStat: function(){
			// 透传参数
			this.send('valueStat', arguments);
		},
		
		// 页面测速
		createTimeStat: function(){
			// 透传参数
			var ist = this.send('createTimeStat', arguments);

			// 没有就先返回个壳
			if(! ist){
				ist = {
					mark: function(){
						this.send('mark', arguments);
					},
					report: function(){
						this.send('report', arguments);
					},
					setZero: function(){
						this.send('setZero', arguments);
					}
				};
			}

			return ist;
		},
		
		// pvuv统计
		pv: function(){
			this.send('pv', arguments);
		},
		
		// 单个点击统计
		hotClick: function(){
			this.send('hotClick', arguments);
		}
	};

	/**
	 * QBL.monitorCgi 返回码统计，默认增加cgi测速
	 * @example		QBL.retcode.create('QBLDetail', 400364);  // cgi连接前创建
					...... // somecode
					QBL.retcode.mark();  // cgi返回后第一时间打个时间点，亦可省略，在report时打一个时间点
					......
					QBL.retcode.report();  // 在合适的时机再上报
	 */
	M.monitorCgi = {
		/**
		 * QBL.monitorCgi.create
		 * 创建测速实例，透传参数
		 * @param {String}	rname	必须，当前页面唯一的实例名
		 * @param {String}	id		必须，OZ生成的id
		 * @param {Object}	conf	可选，其他配置
		 *							conf.timeout	可选，超时时间，默认10s。值为-1时，表示永不超时
		 *							conf.duration	可选，经过的时间，默认自动计算
		 *							conf.reportRate	可选，上报的采样率
		 */
		create: function(rname, id, conf) {
			var ist;

			if(!id){
				return false;
			}
			
			conf = conf || {};
			conf.timeout = conf.timeout || 10000;  // 默认10s超时
			
			ist = {
				starttime: new Date,
				id:	id
			};

			// 请求超时的上报
			if(conf.timeout > 0) {
				// timeout提升，去掉我们自定义的参数，conf中存储的参数都会透传到TCISD中
				ist.timeout = conf.timeout;
				conf.timeout = null;
				delete conf.timeout;

				ist.timer = setTimeout(function() {
					conf.duration = ist.timeout;

					M.monitorCgi.report(3, 2, conf);
				}, ist.timeout);
			}

			ist.conf = conf;

			instance.set(ist, 'cgi-'+ rname);

			return ist;
		},

		/**
		 * CGI返回后，打一个时间点
		 * @param	{String}	rname	可选,区分实例的标识，页面内仅有一个时可省略
		 */
		mark: function(rname) {
			var ist = instance.get('cgi-'+ rname);
			ist && (ist.endtime = new Date);
		},

		/**
		 * 上报返回码
		 * @param	{Int}		code		必须，返回码
		 * @param	{Boolean}	issuccess	是否归入成功，可选，默认是成功
		 *									约定： 上报的返回码>50，为失败的情况；10<返回码<=50,为成功的情况
		 */
		report: function(code, issuccess, rname) {
			var ist = instance.get('cgi-'+ rname),
				conf;

			if(ist) {
				// 清除掉延时的定时器
				ist.timeout>0 && clearTimeout(ist.timer);

				// 如果cgi返回时没打时间点，则这里补打一个
				!ist.endtime && (ist.endtime = new Date);

				conf = ist.conf || {
					reportRate: 1
				};
				issuccess = typeof issuccess === 'undefined' ? 1 : (issuccess ? 1 : 2);  // 默认是成功

				reporter.valueStat(ist.id, issuccess, code, {
					reportRate: conf.reportRate,  // 采样率
					duration: conf.duration || (ist.endtime - ist.starttime)  // 耗时
				});

				// 清除已经上报的数据
				instance.destroy('cgi-'+ rname);
			}
		}
	};

	/**
	 * QBL.monitorPage 页面测速，关键点的加载速度
	 * @example		QBL.speed.create('QBLDetail', [175,362,2]);
					...... // somecode
					QBL.speed.mark();  // 关键路径1
					......
					QBL.speed.mark();  // 关键路径2
					......
					QBL.speed.report();
	 */
	M.monitorPage = {
		/**
		 * 创建测速实例，透传参数
		 * @param {String}	sname	必须，实例名
		 */
		create: function(sname) {
			var ist = reporter.createTimeStat.apply(null, arguments),
				pagetime = window._PAGE_TIME;

			if(typeof pagetime !== 'undefined') {
				ist.setZero(pagetime[0]);  // 取页面的基准时间点，这个约定有

				pagetime.length>1 && ist.mark(1, pagetime[1]);  // js加载完成的时间点，这个如果有，则约定为第一个时间点
			}

			instance.get(ist, 'page-'+ sname);

			return ist;
		},

		/**
		 * 打一个时间点
		 * @param	{String}	seq		可选,序号，省略则自增一个
		 * @param	{String}	sname	可选,若页面内只有一处测速，则可以省略
		 */
		mark: function(seq, sname) {
			var ist = instance.get('page-'+ rname);
			ist && ist.mark.call(ist, seq);
		},
		
		/**
		 * 上报
		 * @param	{String}	 sname	可选,若页面内只有一处测速，则可以省略
		 */
		report: function(sname) {
			var ist = instance.get('page-'+ sname);

			ist && ist.report.call(ist);

			// 清除已经上报的数据，防止翻页等引起的重复上报
			instance.destroy('page-'+ rname);
		}
	};

	/**
	 * QBL.monitorPV pvuv上报
	 * @param {string} [sDomain = location.hostname] 请求pv统计主虚域名
	 * @param {string} [path = location.pathname] 请求pv统计虚路径
	 * @param {object} [opts = {
							referURL: "http://xxxxxxxx", //你需要统计的来源URL，可以随便写，合法的URL即可
							referDomain: "xxxx.xxx.com", //如果你想翻开写，那么可以直接写个来源URL的虚域名
							referPath: "/xxxxx", //如果你想翻开写，那么可以直接写个来源URL的虚路径
							timeout: 500 统计请求发出时延，默认500ms
						}] 可选参数
	 */
	M.monitorPV = {
		report: function(/*sDomain, vpath, opts*/) {
			reporter.pv.apply(null, arguments);
		}
	};

	/**
	 * hotClick 热点点击上报
	 * TODO 其他规则根据需要再加
	 */
	M.monitorClick = {
		report: function(){
			reporter.hotClick.apply(null, arguments);
		}
	};
})(QBL);
