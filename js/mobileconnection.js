var MIN_IDLE_TIME = 30;
var MAX_IDLE_TIME = 7200;
var MACRO_DISPLAY = 1;
var g_connectionData = null;
var g_profileData = null;

var CONNECTMODE_AUTO = 0;
var CONNECTMODE_MANUAL = 1;
var CONNECTMODE_ONDEMAND = 2;

var IDLE_TIME_ENABLE = 1;
var IDLE_TIME_DISABLE = 0;

var g_connect_config = '';
var g_idle_time_enable = 0;
var g_quicksetup_saveDataOK = false;
var g_mobile_dataswitch = null;
redirectOnCondition(null, 'mobileconnection');

function setRoamStatus(_enable) {
    _enable = 0 == _enable ? 1:0;    
    $("input[name='roam_switch']").get(_enable).checked = true;    
}

function setConnectionStatus() {
    if (CONNECTMODE_MANUAL == $('#select_connection_mode').val() && null == g_mobile_dataswitch) {
        $('#roam_open').hide();
        $('#ondemand_connect').hide();
    } else {
        $('#roam_open').show();
        if(IDLE_TIME_ENABLE == g_idle_time_enable && false == g_module.ipv6_enabled ) {
            $('#ondemand_connect').show();
        } else {
            $('#ondemand_connect').hide();
        }
        $('#input_max_idle_time').val(g_connectionData.MaxIdelTime);
        setRoamStatus(parseInt(g_connectionData.RoamAutoConnectEnable,10));
    }
}

function getMobile_dataswitch() {
    getAjaxData('api/dialup/mobile-dataswitch', function($xml) {
        var ret = xml2object($xml);
        if (ret.type == 'response') {
            g_mobile_dataswitch = ret.response;
            if('1' == g_mobile_dataswitch.dataswitch) {
                index_clickTrunOnBtn(true);
            } else {
                index_clickTrunOnBtn(false);
            }
        }
    }, {
        sync: true
    });
}

function initPage() {
    if(g_module.dataswitch_enabled) {
        displaymobile_data(true);
        getMobile_dataswitch();
    } else {
        displaymobile_data(false);
    }
    getConfigData('config/dialup/connectmode.xml', function($xml) {
        var ret = xml2object($xml);
        if ('config' == ret.type) {
            $('#select_connection_mode').empty();
            g_idle_time_enable = ret.config.idle_time_enabled;
            g_connect_config = ret.config.ConnectMode;
            if (1 == g_connect_config.Auto) {
                $('#select_connection_mode').append("<option value='0'><li><a href='javascript:void(0);'>" + common_auto + '</a></li></option>');
            }
            if (1 == g_connect_config.Manual) {
                $('#select_connection_mode').append("<option value='1'><li><a href='javascript:void(0);'>" + common_manual + '</a></li></option>');
            }
            if (1 == g_connect_config.Auto && 1 == g_connect_config.Manual) {
                $('#select_connection_mode').show();
                $('#text_connection_mode').hide();
            } else {
                $('#select_connection_mode').hide();
                $('#text_connection_mode').text($('#select_connection_mode').find("option:selected").text());
                $('#text_connection_mode').show();
            }
        }

    }, {
        sync: true
    });

    // get dialup connection
    getAjaxData('api/dialup/connection', function($xml) {
        var ret = xml2object($xml);
        if (ret.type == 'response') {
            g_connectionData = ret.response;
            if(MACRO_DISPLAY == g_connect_config.Auto) {
                if(MACRO_DISPLAY == g_connect_config.Manual) {
                    $('#select_connection_mode').val(g_connectionData.ConnectMode);
                } else {
                    $('#select_connection_mode').val(CONNECTMODE_AUTO);
                }
            } else {
                if(MACRO_DISPLAY == g_connect_config.Manual) {
                    $('#select_connection_mode').val(CONNECTMODE_MANUAL);
                } else {
                    $('#select_connection_mode').attr('disabled', 'disabled');
                }
            }
        }

    }, {
        sync: true
    });
    setConnectionStatus();
}

function displaymobile_data(isMobile_dataExist) {
    if(isMobile_dataExist) {
        $('.mobile_data').show();
    } else {
        $('.no_mobile_data').show();
        $('#select_connection_mode').bind('change', function() {
            setConnectionStatus();
        });
    }

}

//Button connection or disconnection click effect
function index_clickTrunOnBtn(isTurnOn) {
    if(isTurnOn) {
        $('#mobilenetwork_switch_button').html(create_button_html(common_turn_off, "mobilenetwork_turnOff_button"));
    } else {
        $('#mobilenetwork_switch_button').html(create_button_html(common_turn_on, "mobilenetwork_turnOn_button"));
    }
}

function validateIdletime(idletime) {
    var err = '';
    if (true == isNaN(idletime)) {
        err = dialup_hint_max_idle_time_number;
    } else if ((idletime.indexOf('0') == 0) && (idletime != 0)) {
        err = dialup_hint_max_idle_time_invalid;
    } else if (idletime.indexOf('.') != -1) {
        err = dialup_hint_max_idle_time_integer;
    } else if ((idletime < MIN_IDLE_TIME) || (idletime > MAX_IDLE_TIME)) {
        err = dialup_hint_max_idle_time_range;
    } else {
        err = '';
    }
    return err;
}

function validateConnection() {
    if (CONNECTMODE_AUTO == $('#select_connection_mode').val() || null != g_mobile_dataswitch) {
        var idletime = $('#input_max_idle_time').val();
        var errMessage = validateIdletime(idletime);
        if('' != errMessage) {
            showErrorUnderTextbox('input_max_idle_time', errMessage);
            $('#input_max_idle_time').focus();
            return false;
        }
    }
    return true;
}

function changeMobile_DataSwitch() {
    g_mobile_dataswitch.dataswitch = '1' == g_mobile_dataswitch.dataswitch ? '0' : '1';
    var newXmlString = object2xml('request', g_mobile_dataswitch);
    saveAjaxData('api/dialup/mobile-dataswitch', newXmlString, function($xml) {
        var ret = xml2object($xml);
        if (isAjaxReturnOK(ret)) {
            getMobile_dataswitch();
            showInfoDialog(common_success);
        } else {
            showInfoDialog(common_fail);
        }
    }
    );    
}

function postData() {
    g_quicksetup_saveDataOK = true;
    g_connectionData.ConnectMode = $('#select_connection_mode').val();
    g_connectionData.RoamAutoConnectEnable = $("[name='roam_switch']:checked").val();
    g_connectionData.MaxIdelTime = $.trim($('#input_max_idle_time').val());
    button_enable('apply', '0');
    if (g_module.ap_station_enabled && CONNECTMODE_MANUAL == g_connectionData.ConnectMode) {
        var dataConnection = {
            'Handover': 0
        };
        var newXmlSetString = object2xml('request', dataConnection);
        saveAjaxData('api/wlan/handover-setting', newXmlSetString, function($xml) {
            var ret = xml2object($xml);
            if (!isAjaxReturnOK(ret)) {
                g_quicksetup_saveDataOK = false;
            }
        });
    }
    var newXmlString = object2xml('request', g_connectionData);
    saveAjaxData('api/dialup/connection', newXmlString, function($xml) {
        var ret = xml2object($xml);
        if (isAjaxReturnOK(ret)) {
            showInfoDialog(common_success);
            $('#input_max_idle_time').val(g_connectionData.MaxIdelTime);
            button_enable('apply', '0');
        }else{
            showInfoDialog(common_fail);
            initPage(); 
        }
    });
}

function onApply() {
    if (!isButtonEnable('apply')) {
        return;
    }
    clearAllErrorLabel();

    if (!validateConnection()) {
        return;
    }

    if ((CONNECTMODE_AUTO == $('#select_connection_mode').val()|| null != g_mobile_dataswitch) && ($("[name='roam_switch']:checked").val() > 0)) {
        showConfirmDialog(dialup_hint_roam_auto_connect, postData, function() {
        });
    } else {
        showConfirmDialog(firewall_hint_submit_list_item, postData, function() {
        });
    }
    $('#pop_confirm').click( function() {
        button_enable('apply', '0');
    });
}

$(document).ready( function() {
    initPage();
    button_enable('apply', '0');
    $('#apply').bind('click', onApply);
    $('input,select').bind('change input paste cut keydown', function(e) {
        if(MACRO_KEYCODE != e.keyCode){
            button_enable('apply', '1');
        }
        
    });
    
    $('#mobilenetwork_turnOn_button').live('click', changeMobile_DataSwitch);
    $('#mobilenetwork_turnOff_button').live('click', changeMobile_DataSwitch);
});