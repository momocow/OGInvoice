// ==UserScript==
// @name OGInvoice
// @namespace https://github.com/momocow/OGInvoice
// @description OGame: Trade Tracker
// @version 2.0.0
// @author MomoCow
// @supportURL https://github.com/momocow/OGInvoice/issues
// @updateURL https://gist.githubusercontent.com/momocow/bf932d571dcad386193224ecd6e86d5c/raw/OGInvoice.js
// @include https://*.ogame.gameforge.com/game/index.php?*
// @run-at document-end
// ==/UserScript==

(function() { 
    'use strict';

    //Script Object
    function OGInv(){
		//DATA
        this.calQueue = [];
        this.info = {name: "OGInvoice", version: "2.1.0", author: "MomoCow", site: "https://github.com/momocow", description: "OGame: 自動追蹤/統計 交易資源量", statistic:[], storage: []};
		
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
			if(v && v !== this.info.version){
				this.reset();
				localStorage.setItem('oginv_version', this.info.version);
			}
			else if(!v){
				localStorage.setItem('oginv_version', this.info.version);
			}
		};
		
		this.reset = function(){
			localStorage.removeItem('oginv_' + (/s\d+\-[^\.]+/.exec(location.href)) + '_' + playerId + '_statistic');
			localStorage.removeItem('oginv_' + (/s\d+\-[^\.]+/.exec(location.href)) + '_' + playerId + '_storage');
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
                for(var sidx in this.calQueue){console.log(this.calQueue[sidx]);
                    var logged = false;
                    for(var cidx in this.info.statistic){
                        if(this.info.statistic[cidx].info.src == this.calQueue[sidx].info.src){//console.log(this.info.statistic[cidx]);
                            logged = true;
                            this.info.statistic[cidx].info.name = this.calQueue[sidx].info.name;
                            this.info.statistic[cidx].info.date = now[0];
                            this.info.statistic[cidx].info.time = now[1];
                            this.info.statistic[cidx].info.metal = this.int2res(this.res2int(this.info.statistic[cidx].info.metal) + this.res2int(this.calQueue[sidx].info.metal));
                            this.info.statistic[cidx].info.crystal = this.int2res(this.res2int(this.info.statistic[cidx].info.crystal) + this.res2int(this.calQueue[sidx].info.crystal));
                            this.info.statistic[cidx].info.deut = this.int2res(this.res2int(this.info.statistic[cidx].info.deut) + this.res2int(this.calQueue[sidx].info.deut));
                        }
                    }
                    if(!logged) this.info.statistic.push(new Invoice(this.calQueue[sidx].info.src, now[0], now[1], this.calQueue[sidx].info.src, this.calQueue[sidx].info.name, undefined, undefined, this.calQueue[sidx].info.metal, this.calQueue[sidx].info.crystal, this.calQueue[sidx].info.deut, undefined));
                }
            }

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
		
		this.player = function(name){
			return $(this.playerLib).find('player[name=\'' + name + '\']').attr('id');
		};
		
        this.showPanel = function(){
            $('#menuTable').append('<li><span class="menu_icon"><a id="oginv_btn_setting" class="tooltipRight" title="設定"><div id="oginv_img_setting"></div></span><a id="oginv_btn_info" class="menubutton" href="javascript:void(0)"><span class="textlabel">交易統計</span></a></li>');
            $('#oginv_btn_info').on('click', function (){
                if($('#contentWrapper').css('display') == 'none'){
                    $('#contentWrapper').css('display', 'block');
                    $('#oginv_page').remove();
                    $("#oginv_btn_setting").removeClass("active");
                }
                else{
                    $("#oginv_btn_setting").addClass("active");
                    
                    //DOM contructing
                    $('head').append('<link rel="stylesheet" type="text/css" href="https://cdnjs.cloudflare.com/ajax/libs/semantic-ui/2.2.2/components/button.min.css">');
                    $('#contentWrapper').after('<div id="oginv_page"><div id="oginv_info_banner"><h2>交易統計</h2></div><div class="oginv_row"><div class="oginv_label"><h2>累計交易量</h2></div><div class="oginv_content"><div id="oginv_info_total"><div class="oginv_data"><div class="oginv_field">玩家</div><div class="oginv_field">金屬</div><div class="oginv_field">晶體</div><div class="oginv_field">重氫</div><div class="oginv_field">更新時間</div></div></div></div></div><div class="oginv_row"><div class="oginv_label"><h2>重設所有資料</h2></div><div class="oginv_content"><a class="btn_blue" id="oginv_btn_reset_all"></a></div></div></div>');
                    //show statistic
                    for(var idx in oginv.info.statistic){
                        $('#oginv_info_total').append('<div class="oginv_data"><div class="oginv_field">'+oginv.info.statistic[idx].info.name+'</div><div class="oginv_field">'+oginv.info.statistic[idx].info.metal+'</div><div class="oginv_field">'+oginv.info.statistic[idx].info.crystal+'</div><div class="oginv_field">'+oginv.info.statistic[idx].info.deut+'</div><div class="oginv_field">'+oginv.info.statistic[idx].info.date+' '+oginv.info.statistic[idx].info.time+'</div></div>');
                    }
                    
                    //styling
                    $('#oginv_page').css({'width':"670px", 'overflow':"visible", 'position':"relative", 'padding':"0 0 25px 0",'float':"left"});
                    $('#oginv_info_banner').css({"background-image":'url(https://' + location.host + '/headerCache/resources/ice_1_2_3_4_212.jpg)', "background-repeat":"no-repeat", "height":"300px", "margin":"0 auto 3px auto", "position":"relative", "width":"654px"});
                    $('#oginv_info_banner h2').css({"color":"#fff", "font":"bold 18px/22px Verdana,Arial,Helvetica,sans-serif", "height":"22px", "margin":"0 0 0 144px", "overflow":"hidden", "padding-top":"7px", "white-space":"nowrap", "width":"470px", "text-overflow":"ellipsis"});
                    $('#contentWrapper').css('display', 'none');
                    $('.oginv_row').css({"background":"0", "min-height":"150px", "margin":"0 auto 1px auto", "width":"670px"});
                    $('.oginv_label').css({"height":"28px", "position":"relative", "background-image":"url(//gf1.geo.gfsrv.net/cdn63/10e31cd5234445e4084558ea3506ea.gif)", "background-repeat":"no-repeat"});
                    $('.oginv_label h2').css({"text-align":"center", "color":"#6f9fc8", "font":"700 12px/28px Verdana,Arial,Helvetica,sans-serif"});
                    $('.oginv_content').css({"background":"url(//gf1.geo.gfsrv.net/cdn03/db530b4ddcbe680361a6f837ce0dd7.gif) repeat-y", "margin":"0", "min-height":"115px", "padding":"10px 0", "position":"relative", "text-align":"center"});
                    $('#oginv_info_total').css({'display':'table', 'margin':'auto', 'border-collapse': 'collapse'});
                    $('.oginv_data').css({'display':'table-row'});
                    $('.oginv_field').css({'display':'table-cell', 'padding':'7px 22px 7px 22px'});
                    $('#oginv_info_total, .oginv_data, .oginv_field').css({'border': '1px solid #6f6f6f'});
					
					//event
					$('#oginv_btn_reset_all').on('click', oginv.reset());
                    
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
                                 );
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
    }
    
    //Script instance
    var oginv = new OGInv();
	oginv.update();

    if(location.href.indexOf('ogame.gameforge.com/game/index.php?page=messages') >=0){
        $(document).ajaxSuccess(function(e,d,s){
            if(s.url === "index.php?page=messages&tab=23&ajax=1" || /.*&tabid=23.*&pagination=\d+&ajax=1/.exec(s.data)){
                var tmp = $(document.createElement('div')).append(d.responseText);
                oginv.record(tmp).calculate().save();
            }
        });
	}
		
		oginv.showPanel();
})();