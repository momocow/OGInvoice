// ==UserScript==
// @name OGInvoice
// @namespace https://github.com/momocow/OGInvoice
// @description OGame: Trade Tracker
// @version 3.0.1
// @author MomoCow
// @supportURL https://github.com/momocow/OGInvoice/issues
// @updateURL https://raw.githubusercontent.com/momocow/OGInvoice/master/OGInvoice.user.js
// @include https://*.ogame.gameforge.com/game/index.php?*
// @run-at document-end
// ==/UserScript==

(function(){
    'use strict';

    //Script Object
    function OGInv() {
		//DATA 
        this.calQueue = [];
        this.info = {name: "OGInvoice", version: '3.0.1', author: "MomoCow", site: "https://github.com/momocow", description: "OGame: 自動追蹤/統計 交易資源量", statistic:[], weekly:[], storage: [], setting:{}};
		
		//init
		var sloaded = JSON.parse(localStorage.getItem('oginv_' + (/s\d+\-[^\.]+/.exec(location.href)) + '_' + playerId + '_storage'));
        var cloaded = JSON.parse(localStorage.getItem('oginv_' + (/s\d+\-[^\.]+/.exec(location.href)) + '_' + playerId + '_statistic'));
        var wloaded = JSON.parse(localStorage.getItem('oginv_' + (/s\d+\-[^\.]+/.exec(location.href)) + '_' + playerId + '_weekly'));
        var stloaded = JSON.parse(localStorage.getItem('oginv_' + (/s\d+\-[^\.]+/.exec(location.href)) + '_' + playerId + '_setting'));
		if(sloaded){
            this.info.storage = sloaded;
        }
        if(cloaded){
            this.info.statistic = cloaded;
        }
        if(wloaded){
            this.info.weekly = wloaded;
        }
        if(stloaded){
            this.info.setting = stloaded;
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
            var str = "", neg = '';
            if(int === 0) return '0';
            else if(int < 0) {
                int = (-1) * int;
                neg = '-';
            }
            while(int > 0){
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
            return neg+str;
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
                localStorage.setItem('oginv_' + (/s\d+\-[^\.]+/.exec(location.href)) + '_' + playerId + '_weekly', JSON.stringify(this.info.weekly));
                this.calQueue = [];
            }
            return this;
        };
        
        this.save_setting = function(){
            localStorage.setItem('oginv_' + (/s\d+\-[^\.]+/.exec(location.href)) + '_' + playerId + '_setting', JSON.stringify(this.info.setting));
        };
        
        this.is_under_weekly_contract = function(src, date){
            if(oginv.info.setting['u'+src] && this.info.setting['u'+src].contract_day >= 0){
                var contract_day = this.get_contract_day(src).getTime();
                date = new Date(date.replace(/(\d{1,2})\.(\d{1,2})\.(\d{4})/,'$3 $2 $1')).getTime();
                return (date >= contract_day);
            }
            return false;
        };
		
        this.get_contract_day = function (src){
            if(oginv.info.setting['u'+src] && this.info.setting['u'+src].contract_day >= 0){
                var today = new Date(new Date().setHours(0,0,0,0)),
                    day_diff = (today.getDay() > this.info.setting['u'+src].contract_day)? (today.getDay()-this.info.setting['u'+src].contract_day)*86400000 : (today.getDay()+7-this.info.setting['u'+src].contract_day)*86400000;
                    return new Date(today.getTime()-day_diff);
            }
            return null;
        };
        
        this.calculate = function(){
            if($(this.calQueue).size()>0){
                var now = $('.OGameClock').text().split(" ");
                for(var sidx in this.calQueue){
                    var logged = false;
                    
                    //total statistic
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
                    if(!logged)this.info.statistic.push(new Invoice(this.calQueue[sidx].info.src, this.calQueue[sidx].info.date, this.calQueue[sidx].info.time, this.calQueue[sidx].info.src, this.calQueue[sidx].info.name, undefined, undefined, this.calQueue[sidx].info.metal, this.calQueue[sidx].info.crystal, this.calQueue[sidx].info.deut, undefined).set('udate', now[0]).set('utime', now[1]));
                    
                    //weekly statistic
                    logged = false;
                    if(this.is_under_weekly_contract(this.calQueue[sidx].info.src, this.calQueue[sidx].info.date)){
                        var contract_day = this.get_contract_day(this.calQueue[sidx].info.src);
                        contract_day = contract_day.getDate() + ' ' + (contract_day.getMonth()+1) + ' ' + contract_day.getFullYear();
                        
                        for(var widx in this.info.weekly){
                            if(this.info.weekly[widx].info.src == this.calQueue[sidx].info.src){
                                if(contract_day !== this.info.weekly[widx].info.cdate){
                                    this.info.weekly.splice(widx, 1);
                                    break;
                                }
                                
							    var timestamp3 = this.info.weekly[widx].info.date + ' ' + this.info.weekly[widx].info.time,
							        timestamp4 = this.calQueue[sidx].info.date + ' ' + this.calQueue[sidx].info.time;
                                logged = true;
                                this.info.weekly[widx].info.name = this.calQueue[sidx].info.name;
					    		this.info.weekly[widx].info.date = this.latest_datetime([timestamp3, timestamp4]).date;
                                this.info.weekly[widx].info.time = this.latest_datetime([timestamp3, timestamp4]).time;
                                this.info.weekly[widx].info.metal = this.int2res(this.res2int(this.info.weekly[widx].info.metal) + this.res2int(this.calQueue[sidx].info.metal));
                                this.info.weekly[widx].info.crystal = this.int2res(this.res2int(this.info.weekly[widx].info.crystal) + this.res2int(this.calQueue[sidx].info.crystal));
                                this.info.weekly[widx].info.deut = this.int2res(this.res2int(this.info.weekly[widx].info.deut) + this.res2int(this.calQueue[sidx].info.deut));
                            }
                        }
                        if(!logged) this.info.weekly.push(new Invoice(this.calQueue[sidx].info.src, this.calQueue[sidx].info.date, this.calQueue[sidx].info.time, this.calQueue[sidx].info.src, this.calQueue[sidx].info.name, undefined, undefined, this.calQueue[sidx].info.metal, this.calQueue[sidx].info.crystal, this.calQueue[sidx].info.deut, undefined).set('udate', now[0]).set('utime', now[1]).set('cdate', contract_day));
                    }
                }
            }

            return this;
        };
        
        this.recalculate = function(){
            this.info.statistic = [];
            this.info.weekly = [];
            this.calQueue = [];
            this.calQueue = this.info.storage.slice();
            return this.calculate();
        };
		
        this.record = function(txt){
            $(txt).find('.msg').each(function(id, m){
                var invoice_pattern = /由外來艦隊運送的資源\s(\d\d\.\d\d\.\d\d\d\d)\s(\d\d\:\d\d\:\d\d)\s來自\:\s太空監測\s來自\s(.+)\s\([^\[]+\[(\d\:\d{1,3}:\d{1,2})\]\)\s的一支艦隊正運送著資源到\s.+\s\[(\d\:\d{1,3}\:\d{1,2})\]\s\:金屬\:\s([\d,]+)\s單位,晶體\:\s([\d,]+)\s單位,重氫\:\s([\d,]+)\s單位/;
                var clrStr = $(m).text().replace(/(\s)+/g,'$1');
                var abstract = invoice_pattern.exec(clrStr);
                if(abstract){
                    $(m).remove('a.fright')
                    var invoice = new Invoice($(m).data('msgId'), abstract[1], abstract[2], $($(m).find('.player').attr('title').replace(/玩家\:[^\|]*\|/, '')).find('.sendMail.tooltip').data('playerid'), abstract[3], abstract[4], abstract[5], abstract[6], abstract[7], abstract[8], $(m).html());
                    oginv.push(invoice);
                }
            });
            
            return this;
        };
		
		this.refreshPanel = function(){
            //show contract statistic
            $("#oginv_contract_statistic .oginv_data").remove();
            if($(this.info.weekly).size() > 0){
			    for(var widx in this.info.weekly){
                    var contract_status = '---', contract_amount = this.res2int(this.info.setting['u'+this.info.weekly[widx].info.src].contract_amount);
                    if(contract_amount > 0){
                        contract_status = this.res2int(this.info.weekly[widx].info.deut) - contract_amount;
                        if(contract_status > 0) contract_status = '+' + this.int2res(contract_status);
                        else contract_status = this.int2res(contract_status);
                    }
                    $('#oginv_contract_statistic').append('<div class="oginv_data" data-oginv-uid="' + this.info.weekly[widx].info.src + '" title="最後更新：'+this.info.weekly[widx].info.udate+' '+this.info.weekly[widx].info.utime+'"><div class="oginv_field"><a href="/game/index.php?page=highscore&searchRelId=' + this.info.weekly[widx].info.src + '">'+this.info.weekly[widx].info.name+'</a></div><div class="oginv_field">'+this.info.weekly[widx].info.metal+'</div><div class="oginv_field">'+this.info.weekly[widx].info.crystal+'</div><div class="oginv_field oginv_contracted_res">'+this.info.weekly[widx].info.deut+'<br>('+ contract_status +')</div><div class="oginv_field">'+this.info.weekly[widx].info.date+' '+this.info.weekly[widx].info.time+'</div></div>');
                }
            }
            else{
                if(!$("#oginv_contract_statistic").parents(".oginv_content").find('.noData').length) $('#oginv_contract_statistic').after('<div class="noData">- 無資料 -</div>');
            }
            
            //show statistic
            $("#oginv_info_total .oginv_data").remove();
            if($(this.info.statistic).size() > 0){
			    for(var idx in this.info.statistic){
                    var is_contracted = '';
                    if(this.info.setting['u'+this.info.statistic[idx].info.src]) is_contracted = 'oginv_contracted';
                    $('#oginv_info_total').append('<div class="oginv_data ' + is_contracted + '" title="最後更新：'+this.info.statistic[idx].info.udate+' '+this.info.statistic[idx].info.utime+'"><div class="oginv_field"><a href="/game/index.php?page=highscore&searchRelId=' + this.info.statistic[idx].info.src + '">'+this.info.statistic[idx].info.name+'</a></div><div class="oginv_field">'+this.info.statistic[idx].info.metal+'</div><div class="oginv_field">'+this.info.statistic[idx].info.crystal+'</div><div class="oginv_field">'+this.info.statistic[idx].info.deut+'</div><div class="oginv_field">'+this.info.statistic[idx].info.date+' '+this.info.statistic[idx].info.time+'</div></div>');
                }
            }
            else{
                if(!$("#oginv_info_total").parents(".oginv_content").find('.noData').length) $('#oginv_info_total').after('<div class="noData">- 無資料 -</div>');
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
            $('#oginv_contract_statistic .oginv_data, #oginv_contract_statistic .oginv_field').css({'border': '1px solid #6f6f6f'});
            $('#oginv_info_total .oginv_data:not(.oginv_contracted), #oginv_info_total .oginv_data:not(.oginv_contracted) .oginv_field').hover(function(e){if($(this).hasClass("oginv_data")) $(this).css({"background-color":"rgb(42, 53, 68)", "color": "#f4ff5e"}).find("a").css({"color": "#f4ff5e"});}, function(e){if($(this).hasClass("oginv_data")) $(this).css({"background-color":"transparent", "color": "white"}).find("a").css({"color": "white"});});
            $('#oginv_info_total .oginv_data.oginv_contracted, #oginv_info_total .oginv_data.oginv_contracted .oginv_field').hover(function(e){if($(this).hasClass("oginv_data")) $(this).css({"background-color":"rgb(42, 53, 68)", "color": "#f4ff5e"}).find("a").css({"color": "#f4ff5e"});}, function(e){if($(this).hasClass("oginv_data")) $(this).css({"background-color":"transparent", "color": "rgb(63, 197, 99)"}).find("a").css({"color": "rgb(63, 197, 99)"});});
            $('#oginv_contract_statistic .oginv_data, #oginv_contract_statistic .oginv_data .oginv_field').hover(function(e){if($(this).hasClass("oginv_data")) $(this).css({"background-color":"rgb(42, 53, 68)", "color": "#f4ff5e"}).find("a").css({"color": "#f4ff5e"});}, function(e){if($(this).hasClass("oginv_data")) $(this).css({"background-color":"transparent", "color": "white"}).find("a").css({"color": "white"});});
            $("#oginv_info_raw").accordion({collapsible: true, heightStyle: "content", active: false});
            $("#oginv_info_raw .oginv_info_raw_player").accordion({collapsible: true, heightStyle: "content", active: false});
            $("#oginv_info_total a:link, #oginv_info_total a:visited").css({"text-decoration": "none", "color":"white"});
            $("#oginv_contract_statistic a:link, #oginv_contract_statistic a:visited").css({"text-decoration": "none", "color":"white"});
            $(".oginv_contracted, .oginv_contracted a").css({"color": "rgb(63, 197, 99)"});
            $(".oginv_contracted_res").each(function(i, e){
                var uid = $(e).parents(".oginv_data").data("oginv-uid"),
                    contract_amount = oginv.res2int(oginv.info.setting['u'+uid].contract_amount);
                if(contract_amount > 0){
                    var complete_ratio = Math.min(parseFloat(oginv.res2int($(e).text())) / parseFloat(contract_amount), 1.0),
                        color_r = Math.round(255 + (-254) * complete_ratio),
                        color_g = Math.round(1 + 254 * complete_ratio),
                        color_b = Math.round(4 + (-3) * complete_ratio);
                    $(e).css({"color": "rgb("+color_r+","+color_g+","+color_b+")"});
                }
            });
            
            if($('#oginv_info_page').css('display') == 'none'){
                $("#oginv_btn_setting").addClass("active");
                $('#contentWrapper').css('display', 'none');
                $('#oginv_setting_page').css('display', 'none');
                $('#oginv_info_page').css('display', 'block');
            }
            
            return this;
		};
        
        this.change_setting = function(uid, setting){
            $("#oginv_contract_data_" + uid).removeClass("oginv_flag_value_changed");
            if(setting){
                this.info.setting['u'+uid] = setting;
            }
            else{
                delete this.info.setting['u'+uid];
            }
            return this.recalculate().save();
        };
        
        this.ajax_search = function(m, p){
            $.ajax({url:$(location).prop("protocol") + "//" + $(location).prop("host") +"/game/index.php?page=search",data:{searchValue:$('#oginv_input_search_player').val(),method:m,currentSite:p,ajax:"1"},
                        success:function(data){
                            $("#oginv_search_result").html(data);
                            $("#oginv_search_result .ajaxSearch").on("click", function(e){oginv.ajax_search(2, $(e.target).text());});
                            $("#oginv_search_result th.action").prop("colspan", "1");
                            $("#oginv_search_result td.action a[title=\"寫訊息\"]").each(function(i, e){
                                var uid = $(e).prop('href').replace(/https{0,1}:\/\/.*ogame\.gameforge\.com\/game\/index\.php\?page=chat&playerId=/, '');
                                if(oginv.info.setting['u'+uid]){
                                    $(e).replaceWith("<a class='oginv_contracted tooltipRight icon_nf_link' title='註銷' data-oginv-uid='"+uid+"'><span class='icon_nf icon_favorited' data-oginv-uid='"+uid+"'></span></a>");
                                }
                                else{
                                    $(e).replaceWith("<a class='oginv_to_contract tooltipRight icon_nf_link' title='登記' data-oginv-uid='"+uid+"' ><span class='icon_nf icon_not_favorited' data-oginv-uid='"+uid+"'></span></a>");
                                }
                            });
                            $("#oginv_search_result td.action:odd").remove();
                            
                            //event
                            $(".oginv_to_contract").on("click", function(e){
                                var uid = $(e.target).data("oginv-uid"),
                                    udata = $(e.target).parents("tr").find('.userName').text().trim();
                                $("body").append("<div class='oginv_overlay' id='oginv_overlay_to_contract' title='新增油商'><form><fieldset><label for='oginv_input_contract_day'>每周交易日</label><select class='oginv_select' id='oginv_input_contract_day'><option value='0' selected>星期日</option><option value='1'>星期一</option><option value='2'>星期二</option><option value='3'>星期三</option><option value='4'>星期四</option><option value='5'>星期五</option><option value='6'>星期六</option><option value='-1'>不追蹤交易週期</option></select><label for='oginv_input_contract_amount'>每周交易量</label><input type='text' id='oginv_input_contract_amount' value='0'></fieldset></form></div>");
                                $("#oginv_input_contract_amount").on("keyup", function(e){$(e.target).val(oginv.int2res($(e.target).val().replace(/[^\d]/g, '')));});
                                $("#oginv_input_contract_day").css({"width":"200px"}).on("change", function(e){
                                  if($("#oginv_input_contract_day").val() == -1) $("#oginv_input_contract_amount").prop("disabled", true);
                                  else if ($("#oginv_input_contract_amount").prop("disabled")) $("#oginv_input_contract_amount").prop("disabled", false)
                                });
                                $(".oginv_overlay label").css({"display": "block", "margin": "30px 0 0 0"});
                                $(".oginv_select").css({"display":"block"});
                                $("#oginv_input_contract_day" ).ogameDropDown();
                                //$("#oginv_overlay_to_contract").data("oginv-uid", );
                                $("#oginv_overlay_to_contract").dialog({autoOpen: false, height: 280, width: 350, modal: true, 
                                                                        buttons:{"新增": function(){
                                                                            var cd = $("#oginv_input_contract_day").val(),
                                                                                ca = $("#oginv_input_contract_amount").val();
                                                                            $("#oginv_overlay_to_contract").dialog("close");
                                                                            oginv.change_setting(uid, {contract_day: cd, contract_amount: ca, partner: udata}).refreshSettingPanel();
                                                                        }}, 
                                                                        Cancel: function(){$("#oginv_overlay_to_contract").dialog( "close" );},
                                                                        close: function(){
                                                                                   $("#oginv_input_contract_day option:eq(0)").prop("selected", true);
                                                                                   $("#oginv_input_contract_amount").val(0);
                                                                                   $(this).remove();
                                                                        }
                                }).dialog("open");
                            });
                            
                            $(".oginv_contracted").on("click", function(e){
                                oginv.change_setting($(e.target).data('oginv-uid'), undefined).refreshSettingPanel();
                            });
                            
                            //styling
                            $("#oginv_search_result table").css({"margin-right":"auto", "margin-left":"auto", "width":"100%"}).find("td, th").css({"height":"26px"});
                        },
                        error:function(msg){console.log('[oginv_err] '+msg);}});
        };
        
        this.refreshSettingPanel = function(){
            $("#oginv_contract_list *").remove();
            $("#oginv_contract_list").append("<table><tr><th>#</th><th>玩家名稱</th><th>每周交易量</th><th>每周交易日</th><th>註銷</th></tr></table>");
            var count = 0;
            for(var settingidx in this.info.setting){
                count ++;
                $("#oginv_contract_list table").append("<tr id='oginv_contract_data_"+ settingidx + "' data-uidx='"+ settingidx + "'><td>" + count + "</td><td class='oginv_contract_partner'><a href='/game/index.php?page=highscore&searchRelId=" + settingidx.replace(/u/, '') + "'>" + this.info.setting[settingidx].partner + "</a></td><td><input type='text' class='oginv_contract_table_amount' id='oginv_contract_table_amount_" + settingidx + "' value='" + this.info.setting[settingidx].contract_amount + "'></td><td><select class='oginv_contract_table_day' id='oginv_contract_table_day_" + settingidx + "'><option value='0'>星期日</option><option value='1'>星期一</option><option value='2'>星期二</option><option value='3'>星期三</option><option value='4'>星期四</option><option value='5'>星期五</option><option value='6'>星期六</option><option value='-1'>不追蹤交易週期</option></select></td><td><a class='oginv_btn_contract_remove' href='javascript:void(0)' data-oginv-uid='" + settingidx + "'><span class='oginv_img_contract_remove' id='oginv_img_contract_remove_" + settingidx + "' data-oginv-uid='" + settingidx + "'></span></a></td></tr>");
                $("#oginv_contract_table_day_" + settingidx + ' option[value=' + this.info.setting[settingidx].contract_day + ']').attr("selected", true);
                $("#oginv_contract_table_day_" + settingidx).ogameDropDown();
                $("#oginv_img_contract_remove_" + settingidx).css({"top": (45+(count-1)*27)+"px"});
            }
            
            $("#oginv_contract_list table").css({"margin-right":"auto", "margin-left":"auto", "width":"90%", 'border-collapse': 'collapse','border': '1px solid #6f6f6f'}).find("td, th").css({'border': '1px solid #6f6f6f', "height":"27px"});
            $(".oginv_contract_table_amount").css({"width":"90%"}).on("keyup", function(e){
                $(e.target).val(oginv.int2res(parseInt($(e.target).val().replace(/[^\d]/g, ''))));
                $(this).parents("tr").addClass("oginv_flag_value_changed");
            });
            $(".oginv_img_contract_remove").on("click", function(e){oginv.change_setting($(e.target).data('oginv-uid').replace(/u/, ''), undefined).refreshSettingPanel();});
            $(".oginv_contract_table_day").css({"width":"200px"}).on("change", function(){$(this).parents("tr").addClass("oginv_flag_value_changed");});
            $(".oginv_img_contract_remove").css({'background': 'url(https://gf1.geo.gfsrv.net/cdn96/18e4684df27114667e11541e5b2ef8.png) -208px -71px no-repeat', 'height': '15px', 'width': '15px', "position":"absolute", "right":"44px"});
            $("#oginv_contract_list a:link, #oginv_contract_list a:visited").css({"text-decoration": "none", "color":"white"});
            
            return this.reset_search_form();
        };
        
        this.readable_day = function(day){
            if(typeof day === "number"){
                switch(day){
                    case 0:
                        return "日";
                    case 1:
                        return "一";
                    case 2:
                        return "二";
                    case 3:
                        return "三";
                    case 4:
                        return "四";
                    case 5:
                        return "五";
                    case 6:
                        return "六";
                    default:
                        return "一個禮拜只有7天喔！";
                }
            }
            else if(typeof day === "string"){
                 switch(day){
                    case "日":
                        return 0;
                    case "一":
                        return 1;
                    case "二":
                        return 2;
                    case "三":
                        return 3;
                    case "四":
                        return 4;
                    case "五":
                        return 5;
                    case "六":
                        return 6;
                    default:
                        return "一個禮拜只有7天喔！";
                }
            }
                
            return undefined;
        };
        
        this.reset_search_form = function (){
            $('#oginv_input_search_player').val("");
            $('#oginv_search_result *').remove();
            return this;
        };
		
        this.showPanel = function(){
            $('#menuTable').append('<li><span class="menu_icon"><a id="oginv_btn_setting" class="tooltipRight" title="設定"><div id="oginv_img_setting"></div></span><a id="oginv_btn_info" class="menubutton" href="javascript:void(0)"><span class="textlabel">交易統計</span></a></li>');
            //DOM contructing
            $('#contentWrapper').after('<div class="oginv_page" id="oginv_info_page"><div class="oginv_info_banner"><h2>交易統計</h2></div><div class="oginv_row"><div class="oginv_label"><h2>每周交易追蹤</h2></div><div class="oginv_content"><div id="oginv_contract_statistic"><div class="oginv_data_title"><div class="oginv_field">玩家</div><div class="oginv_field">金屬</div><div class="oginv_field">晶體</div><div class="oginv_field">重氫</div><div class="oginv_field">最後交易時間</div></div></div></div><div class="oginv_row"><div class="oginv_label"><h2>累計交易量</h2></div><div class="oginv_content"><div id="oginv_info_total"><div class="oginv_data_title"><div class="oginv_field">玩家</div><div class="oginv_field">金屬</div><div class="oginv_field">晶體</div><div class="oginv_field">重氫</div><div class="oginv_field">最後交易時間</div></div></div></div></div><div class="oginv_row"><div class="oginv_label"><h2>歷史紀錄</h2></div><div class="oginv_content"><div id="oginv_info_raw" data-state="init"></div></div></div></div>')
                                .after('<div class="oginv_page" id="oginv_setting_page"><div class="oginv_info_banner"><h2>設定</h2></div><div class="oginv_row"><div class="oginv_label"><h2>油商名單</h2></div><div class="oginv_content"><div id="oginv_contract_list"></div><a id="oginv_btn_save_setting" class="btn_blue">保存</a></div></div><div class="oginv_row"><div class="oginv_label"><h2>新增油商</h2></div><div class="oginv_content"><input class="textInput oginv_form" type="search" class="oginv_form" id="oginv_input_search_player" placeholder="玩家名稱" /><a class="btn_blue oginv_form" id="oginv_btn_search_player">搜尋</a><a class="btn_blue oginv_form" id="oginv_btn_search_reset">重設搜尋</a><div id="oginv_search_result"></div></div></div><div class="oginv_row"><div class="oginv_label"><h2>控制台</h2></div><div class="oginv_content"><div class="oginv_table"><div class="oginv_data"><div class="oginv_field"><a class="btn_blue" id="oginv_btn_recal">重新計算</a></div><div class="oginv_field"><a class="btn_blue" id="oginv_btn_reset_all">重設所有交易紀錄和統計資料</a></div></div></div></div></div></div>')
                                .siblings('.oginv_page').css('display', 'none');
            
            //styling
            $('.oginv_page').css({'width':"670px", 'overflow':"visible", 'position':"relative", 'padding':"0 0 25px 0",'float':"left"});
            $('.oginv_info_banner').css({"background-image":'url(https://' + location.host + '/headerCache/resources/ice_1_2_3_4_212.jpg)', "background-repeat":"no-repeat", "height":"300px", "margin":"0 auto 3px auto", "position":"relative", "width":"654px"});
            $('.oginv_info_banner h2').css({"color":"#fff", "font":"bold 18px/22px Verdana,Arial,Helvetica,sans-serif", "height":"22px", "margin":"0 0 0 144px", "overflow":"hidden", "padding-top":"7px", "white-space":"nowrap", "width":"470px", "text-overflow":"ellipsis"});
            $('.oginv_row').css({"background":"0", "min-height":"150px", "margin":"0 auto 1px auto", "width":"670px"});
            $('.oginv_label').css({"height":"28px", "position":"relative", "background-image":"url(//gf1.geo.gfsrv.net/cdn63/10e31cd5234445e4084558ea3506ea.gif)", "background-repeat":"no-repeat"});
            $('.oginv_label h2').css({"text-align":"center", "color":"#6f9fc8", "font":"700 12px/28px Verdana,Arial,Helvetica,sans-serif"});
            $('.oginv_content').css({"background":"url(//gf1.geo.gfsrv.net/cdn03/db530b4ddcbe680361a6f837ce0dd7.gif) repeat-y", "margin":"0", "min-height":"115px", "padding":"10px 0", "position":"relative", "text-align":"center"});
            $('#oginv_info_total').css({'display':'table', 'margin':'auto', 'border-collapse': 'collapse','border': '1px solid #6f6f6f', 'width': '600px'});
			$('#oginv_contract_statistic').css({'display':'table', 'margin':'auto', 'border-collapse': 'collapse','border': '1px solid #6f6f6f', 'width': '600px'});
            $('.oginv_table').css({'display':'table', 'margin':'auto', 'border-collapse': 'collapse'});
            $('.oginv_data, .oginv_data_title').css({'display':'table-row'});
            $('.oginv_field').css({'display':'table-cell', 'padding':'7px 22px 7px 22px'});
            $('#oginv_info_raw').css({"text-align":"left", 'padding':'10px', "max-width":"90%"});
            $("#oginv_search_result").css({"text-align":"left", "padding":"10px"});
            $('.oginv_form').css({"margin":"5px"});
            $("#oginv_btn_save_setting").css({"margin":"5px"});
            
            //event
			$('#oginv_btn_recal').on('click', function(){oginv.recalculate().save().refreshPanel();});
            $('#oginv_btn_reset_all').on('click', function(){oginv.reset();});
            $('#oginv_input_search_player').on('change', function(){
                oginv.ajax_search(2, 1);
            });
            $('#oginv_btn_search_player').on('click', function(){
                oginv.ajax_search(2, 1);
            });
            $('#oginv_btn_search_reset').on('click', function(){
                oginv.reset_search_form();
            });
            $('#oginv_btn_save_setting').on('click', function(){
                $(".oginv_flag_value_changed").each(function(i, e){
                    oginv.change_setting($(e).data("uidx").replace(/u/, ''), {contract_day: $(e).find(".oginv_contract_table_day").val(), contract_amount: $(e).find(".oginv_contract_table_amount").val(), partner: $(e).find(".oginv_contract_partner").text()}).refreshSettingPanel();
                });
                
            });

            $('#oginv_btn_info').on('click', function (){
                if($('#oginv_info_page').css('display') !== 'none'){
                    $('#contentWrapper').css('display', 'block');
                    $('#oginv_setting_page').css('display', 'none');
                    $('#oginv_info_page').css('display', 'none');
                    $("#oginv_btn_setting").removeClass("active");
                    $("#oginv_btn_info").removeClass("selected");
                }
                else{
                    $("#oginv_btn_info").addClass("selected");
                    $('#contentWrapper').css('display', 'none');
                    $('#oginv_setting_page').css('display', 'none');
                    $('#oginv_info_page').css('display', 'block');
                    $("#oginv_btn_setting").removeClass("active");
                    //show statistic
                    oginv.refreshPanel();
                }
                if($('#oginv_btn_setting').hasClass('active')) $('#oginv_img_setting').css('background-position', '0 -27px');
                else $('#oginv_img_setting').css('background-position', '0 0');
            });
  
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
                                         $("#oginv_btn_info").removeClass("selected");
                                     }
                                     else{
                                         $("#oginv_btn_setting").addClass("active");
                                         $('#contentWrapper').css('display', 'none');
                                         $('#oginv_setting_page').css('display', 'block');
                                         $('#oginv_info_page').css('display', 'none');
                                         $("#oginv_btn_info").removeClass("selected");
                                         oginv.refreshSettingPanel();
                                     }
                                     if($('#oginv_btn_setting').hasClass('active')) $('#oginv_img_setting').css('background-position', '0 -27px');
                                     else $('#oginv_img_setting').css('background-position', '0 0');
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
    $(window).unload(function(){oginv.save_setting();});
    
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
