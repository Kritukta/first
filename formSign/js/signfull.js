(function($) {

  //подключение плагина
    $(document).ready(function(){

        $('<object id="plugin0" type="application/x-csuser" width="1" height="1">'+
                    '<param name="onload" value="pluginLoaded" />'+
                    '</object>').appendTo("#body");
 //подключаем выполнение шаблонов
        createTemplate();
       });
    window.plugin = function(){
               return document.getElementById('plugin0');
           };
  //глобальные функции
    var url = window.location.href;
    var xwikiIndex = url.indexOf("/xwiki");
    var  urlShort = url.substring(0, xwikiIndex);

    var spaceDoc=xwikiDoc.space;
    var nameDoc=xwikiDoc.name;
 //список ошибок
    var errorMap ={
        1:"Атрибуты подписываемого файла не корректны",
        2:"Ключ подписи не доступен",
        3:"Нарушена целостность модуля подписания",
        4:"Атрибуты подписываемого файла не корректны",
        5:"Невозможно сохранить подписанный файл",

        7:"Внутренняя ошибка сервера. Обратитесь к системному администратору.",
        8:"Не выбран сертификат",
        9:"Не введен пароль",
        10:"Запрос уже обрабатывается",
        11:"Ошибка плагина Крипто Провайдера",
        12:"Документ успешно подписан",
        13:"Атрибуты подписываемого файла не корректны",
        14:"не формируются данные get запроса",
        15:"Ошибка формирования JСP апплета",
        16:"Отсутствует CSP токен",
    //ошибки csp
        24:"Введен неправильный пароль",
        33:"Не подключается Java плагин ",
        45:"Введен неправильный пароль",
        47:"Введен неправильный пароль"
    };


//вызывается при зарузки страницы распределяет ссылки, привязывает к клику функции валидации и подписи, сохраняется тип подписи signType и данные апплетов
    window.refreshSign = function() {
        $(".xwiki-attachment").each(
            function() {
                var   fileName= $(this).attr("fileName");
                var  messageValidate;
                var  signType;
                var  appletJar;
                var  appletClass;

                if (fileName.indexOf(".xmlsig.xml") != -1
                    || fileName.indexOf(".xmlsig.signed.xml") != -1) {
                    signType="xmlsig" ;
                    appletClass="org.pgg.dsig.xml.SignApplet";
                    appletJar="XMLApplet.jar";

                            if (fileName.indexOf(".signed.xml") != -1) {
                                $(this).click(function(event) {

                                    messageValidate= $('<div></div>').appendTo( $(event.target) );
                                    SignValidate(fileName,messageValidate);
                               }).html("Проверить подпись");

                            } else {
                                $(this).click(function() {

                                    dialogSign(fileName,signType,appletJar,appletClass);
                                }).html("Подписать");
                            }

             } else if (fileName.indexOf("soap.") == 0
                    && fileName.indexOf(".xml") != -1) {

                    signType="soap" ;
                    appletClass="org.pgg.dsig.tech.SignApplet";
                    appletJar="TechApplet.jar";

                            if (fileName.indexOf(".signed.xml") != -1) {

                                $(this).click(function(event) {

                                    messageValidate= $('<div></div>').appendTo( $(event.target) );

                                    SignValidate(fileName,messageValidate);
                                }).html("Проверить подпись");
                            } else {
                                $(this).click(function() {

                                dialogSign(fileName,signType,appletJar,appletClass);

                                }).html("Подписать");
                    }
                } else {
                    signType="pkcs7";
                    appletClass="org.pgg.dsig.p7.SignApplet";
                    appletJar="P7Applet.jar";

                                if (fileName.indexOf(".sig") != -1) {
                                    $(this).click(function(event) {
                                        messageValidate=   $('<div></div>').appendTo( $(event.target) );

                                        SignValidate(fileName,messageValidate);
                                    }).html("Проверить подпись");
                                } else {
                                    $(this).click(function() {
                                        dialogSign(fileName,signType,appletJar,appletClass);
                                    }).html("Подписать");
                                }
                }
            });
    };


  //шаблоны, отрисовывающие интерфейс

    var createTemplate = function(){

        $('<script id="header" type="text/x-jquery-tmpl"> <h2-no-xwiki>Выберите ключевой сертификат:</h2-no-xwiki></script>').appendTo('head');   //заголовок сертификатов


        $('<script id="clientTemplate" type="text/x-jquery-tmpl">' //список сертификатов

            +'<li class="ui-widget-content ui-corner-all">'
            +' <table class="li-widget">'
            +' <tr >'
            +'<td class="li-widget-header">ФИО&nbsp; </td>'
            +'<td class="li-widget-content">${fio}</td>'
            +'</tr>'

            +' <tr>'
            +'<td class="li-widget-header">УЦ&nbsp; </td>'
            +'<td class="li-widget-content">${uz}</td>'
            +' </tr>'

            +'<tr>'
            +'<td class="li-widget-header">UID&nbsp; </td>'
            +' <td class="li-widget-content">${uid}</td>'
            +' </tr>'

            +'<tr>'
            +'<td class="li-widget-content" style="display:none">&nbsp; </td>'
            +' <td class="li-widget-content csp_type_1" id="csp_type_1" style="display:none" >${numToken}</td>'
            +' </tr>'
            +'</table>'
            +' </li>'+'</script>').appendTo('head');


        $('<script id="resizableTmpl" type="text/x-jquery-tmpl">'

            +'<div id="resizable" class="ui-widget-content ui-corner-all">'
            +' <h3 >Статус подписания</h3>'
            +' <div id="error" style=" color:rgb(0,48,75)">&nbsp;</div>'+' </div>'
            +
            ' </script>').appendTo('head');

    }

    //формирование и отображение главного диалогового окна
 var   dialogSign = function(fileNameSign,signType,appletJar,appletClass){

        fileName= fileNameSign;

        var title_version="CSP/JCP ";

        if  (plugin().valid) {
            title_version+="version "+plugin().version;
        }

        var div=$('<div id="dialog" title=title_version style="font: bold 14px Arial, Helvetica, sans-serif;"></div>')
            .dialog({
                width:680,
//                height:560,
                title:title_version,
                modal:true,
                resizable:false,
                buttons:{

                    "Закрыть":function(){
                        $(this).dialog("close");
                        $(this).dialog("destroy");
                    }

                }

            }).bind('dialogclose', function(event) {
                window.location.reload();
            })


        $("div[role=dialog] button:contains('Закрыть')").removeClass('ui-state-default ui-state-hover').addClass('btn btn-danger ');

        //просмотр в XML и PDF

        var attachIndex = url.indexOf("#");
        var fileUrl = url.substring(0, attachIndex)+'/'+fileName;
        var xmlPdfDiv;

        fileUrl=fileUrl.replace('view','download');

            if (signType=='xmlsig' ||signType=='soap' ){

             xmlPdfDiv=$("<div><h2-no-xwiki style='height:30px'>Для предварительного просмотра </br> объекта ("+fileName+") </br>скачайте файл в формате <a href='javascript:window.printXWiki()' style='color:blue'> PDF </a> или <a  id='fileTarget'  style='color:blue'>XML </a></h2-no-xwiki></br> </div>").appendTo(div);

            }else{

             xmlPdfDiv=$("<div><h2-no-xwiki style='height:30px'>Для просмотра содержимого </br> подписываемого элемента ("+fileName+")</br> перейдите по  <a  id='fileTarget'  style='color:blue'>ссылке </a></h2-no-xwiki></br> </div>").appendTo(div);

            }

         $('#fileTarget').click(function(event) {

                 window.open(fileUrl,'_blank')

                           });


        if (plugin().valid){

                    $('<img id="loadImg" src="/xwiki/formSign/css/images/loader.gif" />').appendTo(div).css({'position':'absolute', 'z-index':'1000', 'display':'none'});

                    var testDiv= $("<div></div>").appendTo(div);

                    var header= $('#header').tmpl();

                    header.appendTo(testDiv);

                    var contenu= $("<div id='contenu' ></div>").appendTo(div).css({'overflow-y': 'scroll','height':'210px !important;' }) ;//выбор сертификатов

                    $("<div style='height:50px'></div>").appendTo(div);       //информация о документе

                    var resizable=$("<div ></div>").appendTo(div);

                    var resizableTest=$(resizableTmpl).tmpl();
                    resizableTest.appendTo(resizable);

                    var error=$('#error');

                    var dataForSign= getDataForSign(fileName,spaceDoc,nameDoc,error,appletJar,appletClass);

                  generateCertList(fileName, dataForSign, contenu,signType,error);

            div.find('#contenu').trigger("wakeup");


            $( "#selectable" ).selectable(
                {  //условие чтобы не выбиралось лишнее-не сертификат
                    stop:function(event, ui){
                     $('li:has(.ui-selected)').parent().addClass('ui-selected');
                     $('tr').removeClass('ui-selected');

                    }
                }

            );

           //если сертификат единственнен то автоматом разворачиваем

            if (document.getElementById('selectable').getElementsByTagName("li").length=='1'){
              $('#selectable li').click();
              $('#contenu').css({'overflow-y':'none'});
             }

           //исправление бага клика по свободной области
            $('.password_hidden').click( function(){
                $(this).siblings('li').trigger('click');
                $(this).removeClass('ui-selected');

            }) ;

        }else{

            //begin ajax запрос для подключения JсpApplet
            $.ajax({
                url :urlShort+ "/xwiki-services/sec/getDSIGKey",
                timeout:3000,
                data : {
                    space : spaceDoc,
                    name : nameDoc,
                    file_name : fileName
                },
                success : function(data, status, xhr) {

                    getDataJspApplet(data,appletJar,appletClass,signType);
                },
                error : function(xhr, status, ex) {

                    getDataJspApplet(null,appletJar,appletClass,signType);
                }
            });
            //end ajax запрос для подключения JсpApplet

        }
    }

 var   signProsecc = function(dataForSign,signType){        //функция, непосредственно запускающаяся по кнопке подписать и вызывает общую функцию подписания    Signall


        $('#buttonSign').value="disable";
        $('#buttonSign').css('background-image','none');
        var uid= $('.ui-selected table tr:nth-child(3) td:nth-child(2)').text();
        var num=document.getElementsByClassName('ui-selected')[0].id.substring(14);

     var indexSert=$("#selectable div.CertsInfoArea").index($("div.ui-selected"));
         var password;
          if (document.getElementById('selectable').getElementsByTagName("li").length=='1'){
                password= document.getElementById('password-'+num).value;
            } else{
                 password= document.getElementById('password-'+indexSert).value;
            }


        var error=$('#error');
        var resizable=$('#resizable');

        if(plugin().valid){
            if(uid && password){
                error.html("");

                startLoadingAnimation();

                Signall (error,uid,password,num,urlShort,dataForSign,fileName,signType,spaceDoc,nameDoc);

                stopLoadingAnimation();

            }else{
                stopLoadingAnimation();
                if(!uid)

                error.html(errorMap[8]).addClass('alert alert-error');

                if(!password)

                error.html(errorMap[9]).addClass('alert alert-error');

            }

        }else{

            stopLoadingAnimation();

            error.html(errorMap[11]).addClass('alert alert-error');
        }
    };

    var generateCertList=function(fileName,dataForSign,contenu,signType){  //получение данных и формирование кликабельного списка сертификатов, при клике-отображение инпута пароля
        var olCerts=$("<ol id='selectable' class='ui-selectable'></ol>").appendTo(contenu);
        var error=$('#error');
        var certs = plugin().cspGetKeyList();
        if (certs.length == 0 || certs[0] == '') {

            errorIndicator(false,plugin().cspGetErrorCode(),16);
        }
//            var certs = ['Тестовый Тест Тестович::УЦ::УИД'];
//        certs[1]=certs[0];
//        certs[2]=certs[0];
//        certs[3]=certs[0];
        var generateLiCert= function(cert,i){

            var certNew=cert.split('::');

            var cetInfo=[
                {fio:certNew[2],uz:certNew[3],uid:certNew[1],numToken:certNew[0]}
            ];

            var idLiCert='idLiCertField-'+i;
            var CertsInfoArea =$('<div></div>').appendTo(olCerts).css({'border':'1px solid rgb(170,170,170)','border-radius':'4px','padding':'5px' }).addClass('CertsInfoArea');
            $("#clientTemplate").tmpl(cetInfo).appendTo(CertsInfoArea).attr('id',idLiCert);
            var idPassword='password-'+i;
            var idButtonSign='buttonSign-'+i;
            var passHidden= $('<div class="password_hidden" style="height: 50px; display:none"></div>').appendTo(CertsInfoArea);
            var passInput=$('<h2-no-xwiki>Введите пароль <input type="password" id='+idPassword+' class="passwortInput" ></h2-no-xwiki>').appendTo(passHidden).css('padding-left','0px').addClass('password');

            var signButton=$('<button >Подписать</button>').appendTo(passInput).addClass('btn btn-warning buttonSign').css({'float':'right','margin-right':'5px'}).attr('id',idButtonSign);

            $('#'+idButtonSign).click(
                function() {
                    signProsecc(dataForSign,signType);
                });


            $('#selectable li').click(selectCertificate) ;

            //добавление таблицы при наведении
            CertsInfoArea.hover(
                function(){this.style.border="1px solid rgb(0,0,0)"},
                function(){this.style.border="1px solid rgb(170,170,170)"}
             );

            //исправление бага-( клик на свободную ограниченную область не приводит к клику на сертификат)
            CertsInfoArea.click(
                 function(event){
                    $(event.target).find('li').trigger('click')
                    }
                );


         } ;
        //cписок сертификатов
        for(var i=0;i<certs.length;i++){
            generateLiCert(certs[i],i);
        }

    }


      //отображение полей ввода пароля и кнопки подписать, вызывается при щелчку на сертификат
    function selectCertificate(){

        $('#selectable li').removeClass('ui-selected');

        $('.password_hidden').removeClass('visiblePassword').css('display','none') ;

        $(this).addClass('ui-selected');

        var passwordArea= $('.ui-selected + div');
        passwordArea.css('display','block') ;
        passwordArea.addClass('visiblePassword');
        $('div:has(".visiblePassword")').css({'background-image':'none','background-color':'white'});
        passwordArea.focus();
    }

   //формируется id для использования подписания картинок и текстовых файлов(p7)
    var getId = function(fileName){    //формирование id
        var id = fileName.substring(0,fileName.indexOf(".")).toLowerCase();
        if(id == "fns"){
            id = "fns-AppData";
        }else{
            id = "";
        }
        return id;
    };


  //индикатор успешности подписания
    var errorIndicator = function(success,errorCode, errornumber){

        error=$('#error');
        stopLoadingAnimation();

        if(!success){
            if (errornumber){
                error.html('<a id="plusMinusCheck"> + </a>'+' '+errorMap[errornumber]).addClass('alert alert-error');
            }else{
                error.html('<a id="plusMinusCheck"> + </a>'+' '+errorMap[3]).addClass('alert alert-error');
            }
            $('<div id="errorMessage"></div>').appendTo(error).css({'display':'none'});

            //  если ошибка в ajax- errorIndicator(false,xhr.responseText)

            if (errorCode.toString().indexOf("html")!= -1){
                $('<iframe scrolling="auto" width="520" height="200" id="errorMessageFrame"></iframe>').appendTo('#errorMessage');
                           document.getElementById('errorMessageFrame').contentWindow.document.write(errorCode);
            }else{
                $('<div></div>').appendTo('#errorMessage').html('ErrorCode:'+errorCode);
            }


            error.click(
                function(){
                    document.getElementById('errorMessage').style.display= document.getElementById('errorMessage').style.display=='none'?'block':'none';
                    document.getElementById('plusMinusCheck').innerText= document.getElementById('plusMinusCheck').innerText=='-'?'+':'-';

                    if (errorCode.toString().indexOf("html")!= -1){
                        document.getElementById('dialog').style.height= document.getElementById('dialog').style.height=='664px'?'454px':'664px';
                        document.getElementById('resizable').style.height= document.getElementById('resizable').style.height=='250px'?'50px':'250px';

                    }else{
                        document.getElementById('dialog').style.height= document.getElementById('dialog').style.height=='474px'?'454px':'474px';
                        document.getElementById('resizable').style.height= document.getElementById('resizable').style.height=='70px'?'50px':'70px';


                    }
                }
            )

        }else{


            error.html(errorMap[12]).addClass('alert alert-success');

            $('#div').dialog("close");
        }
    };

    function startLoadingAnimation() // -  запуск анимации при загрузке данных с ajax
       {
           $('.buttonSign').attr('disabled',true);
           var imgObj = $("#loadImg");
           imgObj.show();

           imgObj.css({'position':'absolute', 'top':'50%', 'left':'50%'});

       }

       function stopLoadingAnimation(){   //стоп анимации
           $('#buttonSign').removeAttr('disabled');
           $("#loadImg").hide();
       }

   //xml файл подписывается и кладется на сервер
    var postXml = function(url,cert,spaceDoc,nameDoc,fileName,dataForSing,error,sig)   {

        $.ajax({
            url : url+"/xwiki-services/TransformServlet",
            type : "POST",
            data : {
            timeout:3000,
                space : spaceDoc,
                name : nameDoc,
                file : fileName,
                file_new : fileName.replace(new RegExp(".xml$"), ".signed.xml"),
                type : "xmlsig",
                id : getId(fileName),
                cert : cert,
                signature : sig,
                data : dataForSing
            },
            success : function(data, status, xhr) {
                stopLoadingAnimation();
                errorIndicator(true);
            },
            error : function(xhr, status, ex) {

                error.html(errorMap[6]).addClass('alert alert-error');
                stopLoadingAnimation();
                errorIndicator(false,xhr.responseText);

            }
        });

    }
     //soap файл подписывается и кладется на сервер
    var postSoap = function(url,cert,spaceDoc,nameDoc,fileName,dataForSing,error,sig)   {

        $.ajax({
            url : url+"/xwiki-services/TransformServlet",
            type : "POST",
            timeout:3000,
            data : {
                space : spaceDoc,
                name : nameDoc,
                file : fileName,
                file_new : fileName.replace(new RegExp(".xml$"), ".signed.xml"),
                type : "wssec",
                id : getId(fileName),
                cert : cert,
                signature : sig,
                data : dataForSing
            },
            success : function(data, status, xhr) {
                stopLoadingAnimation();
                errorIndicator(true);

            },
            error : function(xhr, status, ex) {

                error.html(errorMap[6]).addClass('alert alert-error');
                stopLoadingAnimation();
                errorIndicator(false,xhr.responseText);

            }
        });

    }

    //функция подписания p7 (post запрос)
    var postP7 = function(url,cert,spaceDoc,nameDoc,fileName,dataForSign,error,sig)   {

        $.ajax({
            url : url+"/xwiki-services/sec/SaveFileServlet"+
                "?space="+ window.encodeURIComponent(spaceDoc)+
                "&name="+ window.encodeURIComponent(nameDoc)+
                "&file="+ window.encodeURIComponent(fileName+".sig"),
            type : "POST",
            processData:false,
            timeout:3000,
            contentType:"application/octet-stream",
            data : "----- BEGIN PKCS7 SIGNED -----\n"+sig+"\n----- END PKCS7 SIGNED -----",
            success : function(data, status, xhr) {
                stopLoadingAnimation();
                errorIndicator(true);
            },
            error : function(xhr, status, ex) {

                error.html(errorMap[6]).addClass('alert alert-error');
                stopLoadingAnimation();
                errorIndicator(false,plugin().cspGetErrorCode(),6);
            }
        });

    }

    //получение данных для подписи
    function getDataForSign(fileName,spaceDoc,nameDoc,error,appletJar,appletClass){
        var dataForSing = null;
        var typeAjax="";

        var urlRead;
        var appletUrl;

        var getAjaxXmlSoap= function(typeAjax)
        {$.ajax({
            url : urlShort+"/xwiki-services/TransformServlet",
            type : "GET",

            async: false,
            data : {
                space : spaceDoc,
                name : nameDoc,
                file : fileName,
                type : typeAjax,
                id : getId(fileName)
            },
            success : function(data, status, xhr) {

                dataForSing = data;


            },
            error : function(xhr, status, ex) {
                stopLoadingAnimation();
                error.html(errorMap[4]).addClass('alert alert-error');
                errorIndicator(false,xhr.responseText);
            }
        });
        }
        if (fileName.indexOf(".xmlsig.xml")!= -1
            || fileName.indexOf(".xmlsig.signed.xml") != -1){


            typeAjax="xmlsig";
            getAjaxXmlSoap(typeAjax);

            appletUrl = urlShort+"/xwiki-services/TransformServlet"+
                "?space="+ window.encodeURIComponent(xwikiDoc.space)+
                "&name="+ window.encodeURIComponent(xwikiDoc.name)+
                "&file="+ window.encodeURIComponent(fileName)+
                "&type="+ typeAjax+
                "&id="+ getId(fileName);


        }  else if(fileName.indexOf("soap.") == 0
            && fileName.indexOf(".xml") != -1){


            typeAjax="wssec";
            getAjaxXmlSoap(typeAjax);

            appletUrl = urlShort+"/xwiki-services/TransformServlet"+
                "?space="+ window.encodeURIComponent(xwikiDoc.space)+
                "&name="+ window.encodeURIComponent(xwikiDoc.name)+
                "&file="+ window.encodeURIComponent(fileName)+
                "&type="+ typeAjax+
                "&id="+ getId(fileName);


        } else{

            dataForSing = fileName;
            urlRead= url;

            $.ajax({
                url : urlShort+"/xwiki-services/sec/getDSIGKey",
                async: false,
                data : {
                    space : spaceDoc,
                    name : nameDoc,
                    file_name : fileName
                },
                success : function(key,status,xhr){

                    appletUrl = urlShort + "/xwiki-services/techSIG?key=" + key;

                },
                error :
                    function(xhr, status, ex) {
                        stopLoadingAnimation();
                        error.html(errorMap[1]).addClass('alert alert-error');
                        errorIndicator(false,xhr.responseText);
                    }

            });
        }
        var codebase =  urlShort+'/xwiki/resources/applets/';

        var applet = "<applet name='SaveFileApplet' width='0' height='0' archive='"
            + "SaveFileApplet.jar" + "' code='" + "org.pgg.dsig.file.SaveFileApplet"
            + "' codebase='"+codebase+"'>"
            + "<param name='" + "urlRead" + "' value='" + appletUrl + "'>"
            + "</applet>";

        applet = $(applet).appendTo('#dialog');
        return dataForSing;

    }

    //Подключение апплета для jсp подписи
    var getDataJspApplet = function(data,appletJar,appletClass,signType){

        if (!data) {
            error.html(errorMap[15]).addClass('alert alert-error');
        } else {
            var codebase =  urlShort+'/xwiki/resources/applets/';

            var applet = "<applet width='580' height='420' archive='"
                + appletJar + "' code='" + appletClass
                + "' codebase='"+codebase+"'>";
            var params = getParamsFromSignType(data,signType);
            for ( var p in params) {
                applet += "<param name='" + p + "' value='" + params[p] + "'>";
            }
            applet += "</applet>";
            $(applet).appendTo('#dialog');

        }

    }

    //получение данных для get запроса
    var getParamsFromSignType =function(key,signType){

        var urlWithKey = urlShort + "/xwiki-services/techSIG?key=" + key;

        if (signType=="pkcs7"){
            var urlWrite = urlWithKey + "&name="
                + window.encodeURIComponent(fileName+".sig");

        }else{
            var urlWrite = urlWithKey + "&name="
                + window.encodeURIComponent(fileName.replace(".xml",".signed.xml"));
        }

        return {
            urlRead : urlWithKey,
            urlWrite : urlWrite,
            id : getId(fileName)
        };

    }

    //задание карты для подписи, вызов функций для непосредственного подписания
    function  Signall(error,uid,password,num,url,dataForSing,fileName,signType,spaceDoc,nameDoc){


        var sig= '';
        var numToken= document.getElementById("csp_type_1").innerHTML-0;

        var cert = plugin().cspGetCertificateById(numToken*1,uid);

        if( cert == ''){
            stopLoadingAnimation();

            errorIndicator(false,plugin().cspGetErrorCode(),2);
            return;
        }

        var  signInfoMap = {};

        signInfoMap["xmlsig"] = {signedExt:'.signed.xml', signFunc:plugin().cspHashSignDataAnyById, postFunc:postXml};

        signInfoMap["soap"] = {signedExt:'.signed.xml', signFunc:plugin().cspHashSignDataAnyById, postFunc:postSoap};

        signInfoMap["pkcs7"] ={ signedExt:'.sig', signFunc:plugin().cspSignFileById, postFunc:postP7};

        var signInfo = signInfoMap[signType];

        if ((signType=="xmlsig") || (signType=="soap")){

            sig = plugin().cspHashSignDataAnyById(numToken*1, uid, password, dataForSing);
            sig = sig[2];

        }else if (signType=="pkcs7") {
            sig=plugin().cspSignFileById(numToken*1, uid, password, document.SaveFileApplet.getFileName(), 1);
        }
        var cspError=plugin().cspGetErrorCode();
        if(sig.length == 0 || sig[0] == '' ){

            errorIndicator(false,cspError,cspError);

            return;
        }

        signInfo.postFunc(urlShort,cert,spaceDoc,nameDoc,fileName,dataForSing,error,sig);
    }


     //определения типа подписи и передача в основную функцию   валидации
  var  SignValidate= function(fileName, messageValidate){

        if (fileName.indexOf(".xmlsig.xml") != -1
            || fileName.indexOf(".xmlsig.signed.xml") != -1){

            validateDialog(fileName, "xmlsig",getId(fileName), messageValidate);

        }  else if (fileName.indexOf("soap.") == 0

            && fileName.indexOf(".xml") != -1){

            validateDialog(fileName,"wssec",messageValidate);

        }  else {

            var fn = fileName.replace(".sig","");
            validateDialog(fn, "pkcs7",null,fileName,messageValidate);
        }

    }

    var validateDialog = function(fileName, type, id, sig, messageValidate){        // основная функция валидации

        var div = $('<div id="validateDialog" class="validateDialog"></div>').appendTo(messageValidate).css({'display':'block'});
        div.dialog({
            title:'Проверка электронной подписи',
            buttons:{

                "Закрыть":function(){
                    $(this).dialog("close");
                    $(this).dialog("destroy");
                }
            }
        });

        startLoadingAnimation();

        $('.ui-dialog-buttonpane').css({'margin':'none'});
        $("div[role=dialog] button:contains('Закрыть')").removeClass('ui-state-default ui-state-hover ').addClass('btn btn-danger ');

        $("<span></span>").appendTo(div).html("<b>Идет процесс проверки подписи...</b>").css({'font-family':'sans-serif','font-style':'inherit'});

        $.ajax({
            url : urlShort+ "/xwiki-services/sec/ValidateServlet",
            timeout:60000,
            data : {
                space : spaceDoc,
                name : nameDoc,
                file :fileName,
                type:type,
                id:id,
                file_sig:sig
            },
            success : function(data, status, xhr) {

                stopLoadingAnimation();

                messageError(data);
            },
            error : function(xhr, status, ex) {

                stopLoadingAnimation();

                messageError(null);
            }
        });

        var messageError = function(dt) {
            div.children().remove();
            if (!dt) {
                $(".validateDialog").addClass('alert alert-error').css({'margin-bottom':'0px'});
                $("<span></span>").appendTo(div).html("<b>Ошибка:</b>" +errorMap[7]);

            } else {

                var d = eval("("+dt+")");

                var oid=d.msg.substr(d.msg.indexOf('OID'),d.msg.length);
                var sertInfo= oid.substr(oid.indexOf(',')+1, oid.length);

                if(d.success){
                    $(".validateDialog").addClass('alert alert-success').css({'margin-bottom':'0px'});
                    $("<span></span>").appendTo(div).html("<b>Подпись верна: </br></b>"+d.msg+sertInfo).css('word-wrap','break-word');

                }else{
                    $(".validateDialog").addClass('alert alert-error').css({'margin-bottom':'0px'});
                    $("<span></span>").appendTo(div).html("<b>Ошибка:</b> " +d.msg);
                }
            }

        };
    };
}
    )(jQuery);
