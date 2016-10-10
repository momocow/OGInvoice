// ==UserScript==
// @name OGInvoice
// @namespace https://github.com/momocow/OGInvoice
// @description OGame: Trade Tracker
// @version 2.3.0
// @author MomoCow
// @supportURL https://github.com/momocow/OGInvoice/issues
// @updateURL https://gist.githubusercontent.com/momocow/bf932d571dcad386193224ecd6e86d5c/raw/OGInvoice.js
// @include https://*.ogame.gameforge.com/game/index.php?*
// @run-at document-end
// ==/UserScript==

(function(){
    'use strict';

    //Script Object
    function OGInv() {
		//DATA 
        this.calQueue = [];
        this.info = {name: "OGInvoice", version: '2.3.0', author: "MomoCow", site: "https://github.com/momocow", description: "OGame: 自動追蹤/統計 交易資源量", statistic:[], storage: []};
		
		//init
		var sloaded = JSON.parse(localStorage.getItem('oginv_' + (/s\d+\-[^\.]+/.exec(location.href)) + '_' + playerId + '_storage'));
        var cloaded = JSON.parse(localStorage.getItem('oginv_' + (/s\d+\-[^\.]+/.exec(location.href)) + '_' + playerId + '_statistic'));
		if(sloaded){
            this.info.storage = sloaded;
        }
        if(cloaded){
            this.info.statistic = cloaded;
        }
		
		//METHOD
        this.toString = function(){
            return JSON.stringify(this.info);
        };
		
		this.update = function(){
			var v = localStorage.getItem('oginv_version');
			if(v && v === this.info.version){
				return this;
			}
			localStorage.setItem('oginv_version', this.info.version);
			return this;
		};
		
		this.reset = function(){
			localStorage.removeItem('oginv_' + (/s\d+\-[^\.]+/.exec(location.href)) + '_' + playerId + '_statistic');
			localStorage.removeItem('oginv_' + (/s\d+\-[^\.]+/.exec(location.href)) + '_' + playerId + '_storage');
            this.info.storage = [];
            this.info.statistic = [];
			this.refreshPanel();
		};
		
        this.res2int = function(str){
            return parseInt(str.replace(/,/g, ''));
        };
		
        this.int2res = function(int){
            var str = "";
            if(int === 0) return '0';
            else if(int < 0) return 'error: negative resources';
            else while(int > 0){
                if(str !== ""){
                    str = "," + str;
                }
                var tmp_num = (int % 1000).toString();
                int = Math.floor(int / 1000);
                while(tmp_num.length < 3 && int !== 0){
                    tmp_num = '0' + tmp_num;
                }
                str = tmp_num + str;
            }
            return str;
        };
		
		this.latest_datetime  = function(dtset){
			dtset = $.map(dtset, function(value, idx){
				return new Date(value.replace(/(\d{1,2})\.(\d{1,2})\.(\d{4}) (\d\d\:\d\d\:\d\d)/,'$3 $2 $1 $4'));
			});

			var latest = null;
            var lidx = -1;
			for(var dt_idx in dtset){
				if(latest === null || latest.getTime() < dtset[dt_idx].getTime()){
					latest = dtset[dt_idx];
                    lidx = dt_idx;
				}
			}
            
            var rdate = '', rtime = '';
            if(latest.getDate() < 10) rdate += '0' + latest.getDate() + '.';
            else rdate += latest.getDate() + '.';
            if(latest.getMonth() < 9) rdate += '0' + (latest.getMonth() + 1) + '.';
            else rdate += (latest.getMonth() + 1) + '.';
            rdate += latest.getFullYear();

            if(latest.getHours() < 10) rtime += '0' + latest.getHours() + ':';
            else rtime += latest.getHours() + ':';
            if(latest.getMinutes() < 10) rtime += '0' + latest.getMinutes() + ':';
            else rtime += latest.getMinutes() + ':';
            if(latest.getSeconds() < 10) rtime += '0' + latest.getSeconds();
            else rtime += latest.getSeconds();
			return {date: rdate, time: rtime, index:lidx};
		};
		
        this.push = function(item){
            for(var id in this.info.storage){
                if(item.is(this.info.storage[id])){
                    return this;
                }
            }
            
            this.calQueue.push(item);
            this.info.storage.push(item);
            return this;
        };
		
        this.pop = function(){
            this.storage.pop();
            return this;
        };
		
        this.save = function(){
            if($(this.calQueue).size()>0){
                localStorage.setItem('oginv_' + (/s\d+\-[^\.]+/.exec(location.href)) + '_' + playerId + '_statistic', JSON.stringify(this.info.statistic));
                localStorage.setItem('oginv_' + (/s\d+\-[^\.]+/.exec(location.href)) + '_' + playerId + '_storage', JSON.stringify(this.info.storage));
                this.calQueue = [];
            }
            return this;
        };
		
        this.calculate = function(){
            if($(this.calQueue).size()>0){
                var now = $('.OGameClock').text().split(" ");
                for(var sidx in this.calQueue){
                    var logged = false;
                    for(var cidx in this.info.statistic){
                        if(this.info.statistic[cidx].info.src == this.calQueue[sidx].info.src){
							var timestamp1 = this.info.statistic[cidx].info.date + ' ' + this.info.statistic[cidx].info.time,
							    timestamp2 = this.calQueue[sidx].info.date + ' ' + this.calQueue[sidx].info.time;
                            logged = true;
                            this.info.statistic[cidx].info.name = this.calQueue[sidx].info.name;
                            this.info.statistic[cidx].info.udate = now[0];
                            this.info.statistic[cidx].info.utime = now[1];
							this.info.statistic[cidx].info.date = this.latest_datetime([timestamp1, timestamp2]).date;
                            this.info.statistic[cidx].info.time = this.latest_datetime([timestamp1, timestamp2]).time;
                            this.info.statistic[cidx].info.metal = this.int2res(this.res2int(this.info.statistic[cidx].info.metal) + this.res2int(this.calQueue[sidx].info.metal));
                            this.info.statistic[cidx].info.crystal = this.int2res(this.res2int(this.info.statistic[cidx].info.crystal) + this.res2int(this.calQueue[sidx].info.crystal));
                            this.info.statistic[cidx].info.deut = this.int2res(this.res2int(this.info.statistic[cidx].info.deut) + this.res2int(this.calQueue[sidx].info.deut));
                        }
                    }
                    if(!logged) this.info.statistic.push(new Invoice(this.calQueue[sidx].info.src, this.calQueue[sidx].info.date, this.calQueue[sidx].info.time, this.calQueue[sidx].info.src, this.calQueue[sidx].info.name, undefined, undefined, this.calQueue[sidx].info.metal, this.calQueue[sidx].info.crystal, this.calQueue[sidx].info.deut, undefined).set('udate', now[0]).set('utime', now[1]));
                }
            }

            return this;
        };
        
        this.recalculate = function(){
            this.info.statistic = [];
            this.calQueue = [];
            this.calQueue = this.info.storage.slice();
            return this;
        };
		
        this.record = function(txt){
            $(txt).find('.msg').each(function(id, m){
                var invoice_pattern = /由外來艦隊運送的資源\s(\d\d\.\d\d\.\d\d\d\d)\s(\d\d\:\d\d\:\d\d)\s來自\:\s太空監測\s來自\s(.+)\s\([^\[]+\[(\d\:\d{1,3}:\d{1,2})\]\)\s的一支艦隊正運送著資源到\s.+\s\[(\d\:\d{1,3}\:\d{1,2})\]\s\:金屬\:\s([\d,]+)\s單位,晶體\:\s([\d,]+)\s單位,重氫\:\s([\d,]+)\s單位/;
                var clrStr = $(m).text().replace(/(\s)+/g,'$1');
                var abstract = invoice_pattern.exec(clrStr);
                if(abstract){
                    var invoice = new Invoice($(m).data('msgId'), abstract[1], abstract[2], $($(m).find('.player').attr('title').replace(/玩家\:[^\|]*\|/, '')).find('.sendMail.tooltip').data('playerid'), abstract[3], abstract[4], abstract[5], abstract[6], abstract[7], abstract[8], $(m).html());
                    oginv.push(invoice);
                }
            });
            
            return this;
        };
		
		this.refreshPanel = function(){
            //show statistic
            $("#oginv_info_total .oginv_data").remove();
            if($(this.info.statistic).size() > 0){
			    for(var idx in this.info.statistic){
                    $('#oginv_info_total').append('<div class="oginv_data" title="最後更新：'+this.info.statistic[idx].info.udate+' '+this.info.statistic[idx].info.utime+'"><div class="oginv_field">'+this.info.statistic[idx].info.name+'</div><div class="oginv_field">'+this.info.statistic[idx].info.metal+'</div><div class="oginv_field">'+this.info.statistic[idx].info.crystal+'</div><div class="oginv_field">'+this.info.statistic[idx].info.deut+'</div><div class="oginv_field">'+this.info.statistic[idx].info.date+' '+this.info.statistic[idx].info.time+'</div></div>');
                }
            }
            else{
                if(!$('.noData').length) $('#oginv_info_total').after('<div class="noData">- 無資料 -</div>');
            }
            
            //show raw data
            if($("#oginv_info_raw").data("state") != "init"){
                $("#oginv_info_raw").accordion("destroy");
                $("#oginv_info_raw").data("state", "active");
            }
            if($("#oginv_info_raw .oginv_info_raw_player").data("state") != "init"){
                $("#oginv_info_raw .oginv_info_raw_player").accordion("destroy");
                $("#oginv_info_raw").data("state", "active");
            }
            $('#oginv_info_raw *').remove();
            for(var sidx in this.info.storage){
                var owner = this.info.storage[sidx].info.src;
                if($('#oginv_info_raw_u' + owner).size() ==1){
                    var is_appended = false;
                    for(var eidx = 0;eidx < $('#oginv_info_raw_u' + owner + ' .oginv_info_raw_item').size(); eidx++){
                        if(this.latest_datetime([$('#oginv_info_raw_u' + owner + ' .oginv_info_raw_item').eq(eidx).find('.msg_date').text(), this.info.storage[sidx].info.date+' '+this.info.storage[sidx].info.time]).index == 1){
                            $('#oginv_info_raw_u' + owner + ' h3').eq(eidx).before('<h3>' + this.info.storage[sidx].info.date + ' ' + this.info.storage[sidx].info.time + '</h3><div class="oginv_info_raw_item" data-datetime="' + this.info.storage[sidx].info.date + ' ' + this.info.storage[sidx].info.time + '">'+this.info.storage[sidx].info.raw+'</div>');
                            is_appended = true;
                            break;
                        }
                    }
                    
                    if(!is_appended){
                        $('#oginv_info_raw_u' + owner + ' .oginv_info_raw_player').append('<h3>' + this.info.storage[sidx].info.date + ' ' + this.info.storage[sidx].info.time + '</h3><div class="oginv_info_raw_item" data-datetime="' + this.info.storage[sidx].info.date + ' ' + this.info.storage[sidx].info.time + '">'+this.info.storage[sidx].info.raw+'</div>');
                    }
                }
                else{
                    $('#oginv_info_raw').append('<h3>' + this.info.storage[sidx].info.name + '<a class="oginv_info_raw_badge" href="javascript::void(0)"></a></h3><div id="oginv_info_raw_u' + owner + '"><div class="oginv_info_raw_player" data-state="init"><h3>' + this.info.storage[sidx].info.date + ' ' + this.info.storage[sidx].info.time + '</h3><div class="oginv_info_raw_item" data-datetime="' + this.info.storage[sidx].info.date + ' ' + this.info.storage[sidx].info.time + '">' + this.info.storage[sidx].info.raw + '</div></div></div>');
                }
            }
            
            //re-styling
            $('.oginv_data, .oginv_data_title').css({'display':'table-row'});
            $('.oginv_field').css({'display':'table-cell', 'padding':'7px 22px 7px 22px'});
            $('#oginv_info_total .oginv_data, #oginv_info_total .oginv_field').css({'border': '1px solid #6f6f6f'});
            $("#oginv_info_raw").accordion({collapsible: true, heightStyle: "content", active: false});
            $("#oginv_info_raw .oginv_info_raw_player").accordion({collapsible: true, heightStyle: "content", active: false});
            
            if($('#oginv_info_page').css('display') == 'none'){
                $("#oginv_btn_setting").addClass("active");
                $('#contentWrapper').css('display', 'none');
                $('#oginv_setting_page').css('display', 'none');
                $('#oginv_info_page').css('display', 'block');
            }
            
            return this;
		};
		
        this.showPanel = function(){
            $('#menuTable').append('<li><span class="menu_icon"><a id="oginv_btn_setting" class="tooltipRight" title="設定"><div id="oginv_img_setting"></div></span><a id="oginv_btn_info" class="menubutton" href="javascript:void(0)"><span class="textlabel">交易統計</span></a></li>');
            //DOM contructing
            $('#contentWrapper').after('<div class="oginv_page" id="oginv_info_page"><div class="oginv_info_banner"><h2>交易統計</h2></div><div class="oginv_row"><div class="oginv_label"><h2>累計交易量</h2></div><div class="oginv_content"><div id="oginv_info_total"><div class="oginv_data_title"><div class="oginv_field">玩家</div><div class="oginv_field">金屬</div><div class="oginv_field">晶體</div><div class="oginv_field">重氫</div><div class="oginv_field">最後交易時間</div></div></div></div></div><div class="oginv_row"><div class="oginv_label"><h2>歷史紀錄</h2></div><div class="oginv_content"><div id="oginv_info_raw" data-state="init"></div></div></div></div>')
                                .after('<div class="oginv_page" id="oginv_setting_page"><div class="oginv_info_banner"><h2>設定</h2></div><div class="oginv_row"><div class="oginv_label"><h2>控制台</h2></div><div class="oginv_content"><div class="oginv_table"><div class="oginv_data"><div class="oginv_field"><a class="btn_blue" id="oginv_btn_recal">重新計算</a></div><div class="oginv_field"><a class="btn_blue" id="oginv_btn_reset_all">重設所有資料</a></div></div></div></div></div></div>')
                                .siblings('.oginv_page').css('display', 'none');
            
            //styling
            $('.oginv_page').css({'width':"670px", 'overflow':"visible", 'position':"relative", 'padding':"0 0 25px 0",'float':"left"});
            $('.oginv_info_banner').css({"background-image":'url(https://' + location.host + '/headerCache/resources/ice_1_2_3_4_212.jpg)', "background-repeat":"no-repeat", "height":"300px", "margin":"0 auto 3px auto", "position":"relative", "width":"654px"});
            $('.oginv_info_banner h2').css({"color":"#fff", "font":"bold 18px/22px Verdana,Arial,Helvetica,sans-serif", "height":"22px", "margin":"0 0 0 144px", "overflow":"hidden", "padding-top":"7px", "white-space":"nowrap", "width":"470px", "text-overflow":"ellipsis"});
            $('.oginv_row').css({"background":"0", "min-height":"150px", "margin":"0 auto 1px auto", "width":"670px"});
            $('.oginv_label').css({"height":"28px", "position":"relative", "background-image":"url(//gf1.geo.gfsrv.net/cdn63/10e31cd5234445e4084558ea3506ea.gif)", "background-repeat":"no-repeat"});
            $('.oginv_label h2').css({"text-align":"center", "color":"#6f9fc8", "font":"700 12px/28px Verdana,Arial,Helvetica,sans-serif"});
            $('.oginv_content').css({"background":"url(//gf1.geo.gfsrv.net/cdn03/db530b4ddcbe680361a6f837ce0dd7.gif) repeat-y", "margin":"0", "min-height":"115px", "padding":"10px 0", "position":"relative", "text-align":"center"});
            $('#oginv_info_total').css({'display':'table', 'margin':'auto', 'border-collapse': 'collapse','border': '1px solid #6f6f6f', 'max-width': '550px'});
			$('.oginv_table').css({'display':'table', 'margin':'auto', 'border-collapse': 'collapse'});
            $('#oginv_info_raw').css({"text-align":"left", 'padding':'10px', "max-width":"90%"});
            
            //event
			$('#oginv_btn_recal').on('click', function(){oginv.recalculate().calculate().save().refreshPanel();});
            $('#oginv_btn_reset_all').on('click', function(){oginv.reset();});
            
            $('#oginv_btn_info').on('click', function (){
                if($('#oginv_info_page').css('display') !== 'none'){
                    $('#contentWrapper').css('display', 'block');
                    $('#oginv_setting_page').css('display', 'none');
                    $('#oginv_info_page').css('display', 'none');
                    $("#oginv_btn_setting").removeClass("active");
                    $("#oginv_btn_info").removeClass("selected");
                }
                else{
                    $("#oginv_btn_setting").addClass("active");
                    $("#oginv_btn_info").addClass("selected");
                    $('#contentWrapper').css('display', 'none');
                    $('#oginv_setting_page').css('display', 'none');
                    $('#oginv_info_page').css('display', 'block');
                    //show statistic
                    oginv.refreshPanel();
                }});
            $('#oginv_img_setting').css('background', 'transparent url(https://i.imgur.com/PkGTYyO.png) no-repeat 0 0')
                                   .css('height', '27px')
                                   .css('width', '27px')
                                   .hover(function (){
                                       $(this).css('background-position', '0 -54px');
                                     }, function (){
                                       if($('#oginv_btn_setting').hasClass('active')) $(this).css('background-position', '0 -27px');
                                       else $(this).css('background-position', '0 0');
                                     }
                                   )
                                   .on('click', function(){
                                     if($('#oginv_setting_page').css('display') !== 'none'){
                                         $('#contentWrapper').css('display', 'block');
                                         $('#oginv_setting_page').css('display', 'none');
                                         $('#oginv_info_page').css('display', 'none');
                                         $("#oginv_btn_setting").removeClass("active");
                                     }
                                     else{
                                         $("#oginv_btn_setting").addClass("active");
                                          $('#contentWrapper').css('display', 'none');
                                          $('#oginv_setting_page').css('display', 'block');
                                          $('#oginv_info_page').css('display', 'none');
                                     }
                                 });
        };
    }
    
    //Storage Item Object
    function Invoice(i, da, ti, s, n, f,to, m, c, de, r){
        this.info = {id: i, date: da, time: ti, src: s, name: n, from: f, to: to, metal: m, crystal: c, deut: de, raw: r};
        this.toString = function(){
            return JSON.stringify(this.info);
        };
        this.is = function(other){
            if(this.info.id && other.info.id) return (this.info.id === other.info.id);
            return false;
        };
		this.set = function(index, value){
			this.info[index] = value;
			return this;
		};
    }
    
    //Script instance
    var oginv = new OGInv();
    
    if(location.href.indexOf('ogame.gameforge.com/game/index.php?page=messages') >=0){
        $(document).ajaxSuccess(function(e,d,s){
            if(s.url === "index.php?page=messages&tab=23&ajax=1" || /.*&tabid=23.*&pagination=\d+&ajax=1/.exec(s.data)){
                var tmp = $(document.createElement('div')).append(d.responseText);
                oginv.update().record(tmp).calculate().save();
            }
        });
	}
		
		oginv.showPanel();
})();