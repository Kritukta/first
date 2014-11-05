/**
 * @class IFCPlugin
 * @param pluginObject HTMLObject со страницы с плагином.
 * @description Объект для работы с плагином.
 * @example var ifcPlugin = new IFCPlugin(document.getElementById("IFCPluginName"));
 */
function IFCPlugin(pluginObject) {
    this.libVersion = "1.2.1.0";
    this.supportedPluginVersion = "2.0.4.0";
    this.guidPrefix = "";

    var lastLibraryErrorCode = 0;
    var isLastLibraryError = false;

    // BEGIN - These methods are recommended to be used

    /**@public
     * @description Проверяет, валиден ли плагин.
     * @returns {Boolean} true - плагин валиден, false - плагин невалиден.
     * */
    this.isValid = function () {
        clearLibraryError();

        if (this.plugin() != null
            && this.plugin().valid
            && this.plugin().create() == 0) {
            return true;
        } else {
            setLibraryError(IFCError.IFC_PLUGIN_UNDEFINED_ERROR);
        }
    }

    /**@public
     * @description Возвращает версию плагина.
     * @returns {String} Формат версии: X.X.X, где - X десятичное число. Например, 2.0.0
     * */
    this.getPluginVersion = function () {
        if (!this.isValid())
            return "";

        return this.plugin().version;
    }

    /**@public
     * @description Возвращает версию данной JavaScript-библиотеки.
     * @returns {String} Формат версии: X.X.X.X, где - X десятичное число. Например, 1.0.17.0
     * */
    this.getLibVersion = function () {
        return this.libVersion;
    }

    /**@public
     * @description Возвращает код результата выполнения последней операции.
     * @returns {Number} Код: 0x0000 (константа IFCError.IFC_OK) - операция выполнена успешно.
     * */
    this.getErrorCode = function () {
        if (isLastLibraryError) {
            return lastLibraryErrorCode;
        } else {
            return this.plugin().get_last_error();
        }
    }

    /**@public
     * @description Возвращает описание кода результата выполнения плагином последней операции.
     * @returns {String} Строка описания соответствующего кода результата выполнения последней операции (IFCPlugin.getErrorCode()).
     * */
    this.getErrorDescription = function () {
        return IFCError.getErrorDescription(this.getErrorCode());
    }

    // Methods for getting info about connected tokens\smart-cards

    /**@public
     * @description Возвращает перечень СКЗИ, доступных для плагина, в виде массива объектов IFCCrypto.
     * @returns {IFCCrypto[]} Массив объектов, содержащих информацию о найденных СКЗИ, в том числе идентификатор СКЗИ (cryptoId)
     * */
    this.getCryptoList = function () {
        if (!this.isValid())
            return new Array();

        return this.getCryptoListByType(null);
    }

    /**@public
     * @description Возвращает перечень СКЗИ, доступных для плагина через интерфейс PKCS#11, в виде массива объектов IFCCrypto.
     * @returns {IFCCrypto[]} Массив объектов, содержащих информацию о найденных СКЗИ, в том числе идентификатор СКЗИ (cryptoId).
     * */
    this.getPKCS11CryptoList = function () {
        if (!this.isValid())
            return new Array();

        return this.getCryptoListByType(IFCConst.IFC_CRYPTO_PKCS11);
    }

    /**@public
     * @description Возвращает перечень СКЗИ, доступных для плагина через интерфейс CAPI, в виде массива объектов IFCCrypto.
     * @returns {IFCCrypto[]} Массив объектов, содержащих информацию о найденных СКЗИ, в том числе идентификатор СКЗИ (cryptoId).
     * */
    this.getCAPICryptoList = function () {
        if (!this.isValid())
            return new Array();

        return this.getCryptoListByType(IFCConst.IFC_CRYPTO_CAPI);
    }

    /**@public
     * @description Возвращает информацию о СКЗИ (объект IFCCrypto), по переданному на вход cryptoId.
     * @returns {IFCCrypto} Объект, содержащий информацию о найденном СКЗИ, в том числе идентификатор СКЗИ (cryptoId).
     * */
    this.getCryptoById = function (cryptoId) {
        var cryptoList = this.getCryptoList();

        if (this.getErrorCode() == 0) {
            if (cryptoList.length <= 0)
                return null;	// No cryptos

            for (var i = 0; i < cryptoList.length; i++) {
                if (cryptoId == cryptoList[i].getCryptoId()) {
                    return cryptoList[i];
                }
            }
        }

        return null;
    }

    /**@public
     * @description Возвращает перечень сертификатов, доступных для Модуля, в виде массива объектов IFCCertificate.
     * @returns {IFCCertificate[]} Массив объектов, содержащих краткую информацию о найденном сертификате,
     * в том числе идентификатор контейнера (containerId), в котором содержится сертификат.
     * */
    this.getCertificateList = function () {
        if (!this.isValid())
            return new Array();

        var fullList = new Array();
        var rc = 0;
        var j = 0;
        var certsCount = 0;

        var cryptoList = this.getCryptoList();

        if (this.getErrorCode() == 0) {
            if (cryptoList.length <= 0)
                return new Array();	// No cryptos

            for (var i = 0; i < cryptoList.length; i++) {
                var certList = this.getCertificates(cryptoList[i])
                if (this.getErrorCode() != 0)
                    return new Array();

                if (certList.length <= 0)
                    continue; // no certificates

                for (j = 0; j < certList.length; j++)
                    fullList[certsCount++] = certList[j];
            }
        } else {
            return new Array();
        }

        return fullList;
    }

    /**@public
     * @description Возвращает перечень сертификатов, в виде массива объектов IFCCertificate. Поиск сертификатов производится на СКЗИ, заданном с помощью идентификатора СКЗИ (cryptoId).
     * @returns {IFCCertificate[]} Массив объектов, содержащих краткую информацию о найденном сертификате,
     * в том числе идентификатор контейнера (containerId), в котором содержится сертификат.
     * */
    this.getCertificateListByCryptoId = function (cryptoId) {
        if (!this.isValid())
            return new Array();

        var fullList = new Array();
        var rc = 0;
        var j = 0;
        var certsCount = 0;

        var crypto = this.getCryptoById(cryptoId);

        var certList = this.getCertificates(crypto);

        if (this.getErrorCode() != 0)
            return new Array();

        if (certList.length <= 0)
            return new Array(); // no certificates

        for (j = 0; j < certList.length; j++)
            fullList[certsCount++] = certList[j];

        return fullList;
    }

    /**@public
     * @description Возвращает перечень ключевых контейнеров, в виде массива объектов IFCCertificate.
     * Поиск сертификатов производится на СКЗИ, заданном с помощью идентификатора СКЗИ (cryptoId).
     * Отображает в том числе контейнеры, в которых не содержится сертификата.
     * @returns {IFCCertificate[]} Массив объектов, содержащих краткую информацию о найденном сертификате,
     * в том числе идентификатор контейнера (containerId), в котором содержится сертификат.
     * */
    this.getKeyListByCryptoId = function (cryptoId, userPin) {
        if (!this.isValid())
            return new Array();

        var keyList = new Array();
        var listSize = 0;
        var rc = 0;
        var info;

        var crypto = this.getCryptoById(cryptoId);

        if (!(userPin && userPin.length > 0) && crypto.isPKCS11()) {
            setLibraryError(IFCError.IFC_P11_INVALID_PIN_ERROR);
            return new Array();
        }

        listSize = this.plugin().get_list_keys_size(cryptoId, userPin);

        if (listSize < 1)
            return new Array();

        for (var i = 0; i < listSize; i++) {
            info = new Array();

            rc = this.plugin().get_list_keys(i, info);
            if (rc != 0)
                return new Array();

            keyList[i] = new IFCCertificate(info, this.getCryptoById(cryptoId));
        }

        return keyList;
    }

    /**@public
     * @description Получение идентификатора криптоустройства по ContainerId.
     * @returns {String} Идентификатор криптоустройства.
     * */
    this.getCryptoIdByContainerId = function (containerId) {
	if (containerId.indexOf("CryptoPro") >= 0 || containerId.indexOf("VIPNet") >= 0) {
        	return containerId.substring(0, containerId.indexOf("/"));
	} else {
        	return containerId.substring(0, containerId.lastIndexOf("/"));
	}
    }

    // Digital signature generating methods

    // Sign string

    /**@public
     * @description Формирует электронную подпись в формате CMS Attached для переданной строки данных.
     * @returns {String} Значение полученной подписи в формате CMS Attached, кодированной в Base64.
     * */
    this.signDataCmsAttached = function (containerId, pin, data) {
        if (!this.isValid())
            return null;

        return this.sign(containerId, pin, data, IFCConst.IFC_DATATYPE_DATA, IFCConst.IFC_SIGNTYPE_PKCS7ATTACHED);
    }

    /**@public
     * @description Формирует электронную подпись в формате CMS Detached для переданной строки данных.
     * @returns {String} Значение полученной подписи в формате CMS Detached, кодированной в Base64.
     * */
    this.signDataCmsDetached = function (containerId, pin, data) {
        if (!this.isValid())
            return null;

        return this.sign(containerId, pin, data, IFCConst.IFC_DATATYPE_DATA, IFCConst.IFC_SIGNTYPE_PKCS7DETACHED);
    }

    /**@public
     * @description Формирует "сырую" электронную подпись, прямой порядок байт.
     * @returns {String} Значение полученной подписи (набор байт), кодированное в Base64.
     * Прямой порядок байт подписи.
     * */
    this.signDataSimple = function (containerId, pin, data) {
        if (!this.isValid())
            return null;

        return this.sign(containerId, pin, data, IFCConst.IFC_DATATYPE_DATA, IFCConst.IFC_SIGNTYPE_SIMPLE);
    }

    /**@public
     * @description Формирует "сырую" электронную подпись, обратный порядок байт.
     * @returns {String} Значение полученной подписи (набор байт), кодированное в Base64.
     * Обратный порядок байт подписи.
     * */
    this.signDataSimpleReversed = function (containerId, pin, data) {
        if (!this.isValid())
            return null;

        return this.sign(containerId, pin, data, IFCConst.IFC_DATATYPE_DATA, IFCConst.IFC_SIGNTYPE_SIMPLE_REVERSE);
    }

    // Get base64 string, decode it and sign decoded content.

    /**@public
     * @description Декодирует из base64 данные входной строки. Формирует электронную подпись для декодированного содержимого
     * в формате CMS Attached.
     * @returns {String} Значение полученной подписи в формате CMS Attached, кодированной в Base64.
     * */
    this.signDataBase64CmsAttached = function (containerId, pin, data) {
        if (!this.isValid())
            return null;

        return this.sign(containerId, pin, data, IFCConst.IFC_DATATYPE_DATA_BASE64, IFCConst.IFC_SIGNTYPE_PKCS7ATTACHED);
    }

    /**@public
     * @description Декодирует из base64 данные входной строки. Формирует электронную подпись для декодированного содержимого
     * в формате CMS Detached.
     * @returns {String} Значение полученной подписи в формате CMS Detached, кодированной в Base64.
     * */
    this.signDataBase64CmsDetached = function (containerId, pin, data) {
        if (!this.isValid())
            return null;

        return this.sign(containerId, pin, data, IFCConst.IFC_DATATYPE_DATA_BASE64, IFCConst.IFC_SIGNTYPE_PKCS7DETACHED);
    }

    /**@public
     * @description Декодирует из base64 данные входной строки. Формирует электронную подпись.
     * @returns {String} Значение полученной подписи (набор байт), кодированное в Base64.
     * Прямой порядок байт подписи.
     * */
    this.signDataBase64Simple = function (containerId, pin, data) {
        if (!this.isValid())
            return null;

        return this.sign(containerId, pin, data, IFCConst.IFC_DATATYPE_DATA_BASE64, IFCConst.IFC_SIGNTYPE_SIMPLE);
    }

    // PKCS#11 only methods

    /**@public
     * @description Инициализация СКЗИ. Только для PKCS#11.
     * @returns {Boolean} true - операция выполнена успешно.
     * false - возникла ошибка при выполнении.
     * */
    this.pkcs11Init = function (cryptoId, cryptoDescription, userPin, adminPin) {
        if (!this.isValid())
            return false;

        if (validatePin(userPin)) {
            return IFCError.IFC_OK == this.plugin().p11_init(cryptoId, cryptoDescription, userPin, adminPin);
        } else {
            return false;
        }
    }

    /**@public
     * @description Смена ПИН-кода пользователя для СКЗИ. Только для PKCS#11.
     * @returns {Boolean} true - операция выполнена успешно.
     * false - возникла ошибка при выполнении.
     * */
    this.pkcs11ChangeUserPin = function (cryptoId, currentPin, newPin) {
        if (!this.isValid())
            return false;

        if (!(currentPin && currentPin.length > 0)) {
            setLibraryError(IFCError.IFC_P11_INVALID_PIN_ERROR);
            return false;
        }

        if (validatePin(newPin)) {
            return IFCError.IFC_OK == this.plugin().p11_pin_change(cryptoId, IFCConst.P11_PIN_TYPE_USER, currentPin, newPin);
        } else {
            return false;
        }
    }

    /**@public
     * @description Разблокировать ПИН-код пользователя СКЗИ. Только для PKCS#11.
     * @returns {Boolean} true - операция выполнена успешно.
     * false - возникла ошибка при выполнении.
     * */
    this.pkcs11UnlockUserPin = function (cryptoId, adminPin) {
        if (!this.isValid())
            return false;

        if (!(adminPin && adminPin.length > 0)) {
            setLibraryError(IFCError.IFC_P11_INVALID_PIN_ERROR);
            return false;
        }

        return IFCError.IFC_OK == this.plugin().p11_pin_unlock(cryptoId, adminPin);
    }

    /**@public
     * @description  Смена ПИН-кода администратора для СКЗИ. Только для PKCS#11.
     * @returns {Boolean} true - операция выполнена успешно.
     * false - возникла ошибка при выполнении.
     * */
    this.pkcs11ChangeAdminPin = function (cryptoId, currentPin, newPin) {
        if (!this.isValid())
            return false;

        if (!(currentPin && currentPin.length > 0)) {
            setLibraryError(IFCError.IFC_P11_INVALID_PIN_ERROR);
            return false;
        }

        if (validatePin(newPin)) {
            return IFCError.IFC_OK == this.plugin().p11_pin_change(cryptoId, IFCConst.P11_PIN_TYPE_ADMIN, currentPin, newPin);
        } else {
            return false;
        }
    }

    /**@public
     * @description Изменяет идентификатор контейнера, сохраненного на СКЗИ. Только для PKCS#11.
     * @returns {Boolean} true - операция выполнена успешно.
     * false - возникла ошибка при выполнении.
     * */
    this.pkcs11RenameContainer = function (containerId, newContainerId, userPin) {
        if (!this.isValid())
            return false;

        var newArrayId = newContainerId.split("/");

        if (!(userPin && userPin.length > 0)) {
            setLibraryError(IFCError.IFC_P11_INVALID_PIN_ERROR);
            return false;
        }

        return IFCError.IFC_OK == this.plugin().p11_key_rename(containerId, newArrayId[newArrayId.length - 1], userPin);
    }


    /**@public
     * @description "Перемещает" контейнер из oldContainerId в newContainerId. Только для PKCS#11.
     * Алгоритм: удаляет контейнер с newContainerId, если он существует. Переименовывает контейнер
     * oldContainerId в newContainerId
     * @returns {Boolean} true - операция выполнена успешно.
     * false - возникла ошибка при выполнении.
     * */
    this.pkcs11MoveContainer = function (oldContainerId, newContainerId, userPin) {
        if (!this.isValid())
            return false;

        // Containers must reside on the same cryptotoken
        if (this.getCryptoIdByContainerId(oldContainerId) != this.getCryptoIdByContainerId(newContainerId)) {
            return false;
        }

        // checking, if we delete the pkcs11 container
        var crypto = this.getCryptoById(this.getCryptoIdByContainerId(newContainerId));

        if (crypto != null && crypto.isPKCS11()) {
            // deleting the old container
            this.deleteContainer(newContainerId, userPin);

            // if deleted successfully, or key container does not exists
            if (ifcPlugin.getErrorCode() == 0 || ifcPlugin.getErrorCode() == 10) {
                // trying to rename new container
                return this.pkcs11RenameContainer(oldContainerId, newContainerId, userPin);
            } else {
                return false;
            }
        } else {
            return false;
        }
    }

    // Methods for managing key pairs and certificates.

    /**@public
     * @description Генерация ключевой пары и CSR.
     * @returns {IFCCertificateRequest} Объект содержит сгенерированный идентификатор контейнера и значение запроса на сертификат, кодированное в Base64.
     * */
    this.generateKeyPairAndCsr = function (cryptoId, userPin, subjectDN) {
        if (!this.isValid())
            return null;

        var containerId = cryptoId + "/" + this.getGuid();

        return this.generateKeyPairAndCsrForContainerId(containerId, userPin, subjectDN);
    }

    /**@public
     * @description Генерация ключевой пары и CSR. ContainerId задается входным параметром.
     * @returns {IFCCertificateRequest} Объект содержит заданный идентификатор контейнера и значение запроса на сертификат, кодированное в Base64.
     * */
    this.generateKeyPairAndCsrForContainerId = function (containerId, userPin, subjectDN) {
        var cryptoId = this.getCryptoIdByContainerId(containerId);

        var crypto = this.getCryptoById(cryptoId);

        if (!(userPin && userPin.length > 0) && crypto.isPKCS11()) {
            setLibraryError(IFCError.IFC_P11_INVALID_PIN_ERROR);
            return new Array();
        }

        return this.generateKeyPairAndCsrExtended(containerId, userPin, subjectDN, crypto.getExtendedKeyUsage(), crypto.getCertificatePolicies())
    }

    /**@public
     * @description Записывает сертификат в ключевой контейнер.
     * @returns {Boolean} true - операция выполнена успешно.
     * false - возникла ошибка при выполнении.
     * */
    this.putCertificate = function (cryptoId, userPin, certificateValue) {
        if (!this.isValid())
            return false;

        var crypto = this.getCryptoById(cryptoId);

        if (!(userPin && userPin.length > 0) && crypto.isPKCS11()) {
            setLibraryError(IFCError.IFC_P11_INVALID_PIN_ERROR);
            return false;
        }

        var cert = Array();
        cert['cert'] = certificateValue.split(" ").join("");

        // Load certificate from BASE64-data or PEM-data
        var x509Handle = this.plugin().load_x509_from_data(cert, IFCConst.IFC_CERT_UNKNOWN);
        if (0 > x509Handle)
            return false;

        // Set the certificate to a container
        var rc = this.plugin().set_x509(cryptoId, userPin, x509Handle);

        // Free certificate
        this.plugin().free_x509(x509Handle);

        return IFCError.IFC_OK == rc;
    }

    /**@public
     * @description Удаляет ключевой контейнер.
     * @returns {Boolean} true - операция выполнена успешно.
     * false - возникла ошибка при выполнении.
     * */
    this.deleteContainer = function (containerId, userPin) {
        var crypto = this.getCryptoById(this.getCryptoIdByContainerId(containerId));

        if (!(userPin && userPin.length > 0) && crypto.isPKCS11()) {
            setLibraryError(IFCError.IFC_P11_INVALID_PIN_ERROR);
            return false;
        }

        return IFCError.IFC_OK == this.plugin().key_delete(containerId, userPin);
    }

    /**@public
     * @description Генерация псевдослучайного GUID. GUID используется при генерации уникальных containerId
     * @returns {String} GUID.
     * */
    this.getGuid = function () {
        if (!this.isValid())
            return null;

        var guidArray = new Array();

        if (0 == this.plugin().get_guid(this.guidPrefix, guidArray)) {
            return guidArray['guid'];
        } else {
            return null;
        }
    }

    /**@public
     * @description Устанавливает префикс, используемый для генерации GUID.
     * @returns {void}
     * */
    this.setGuidPrefix = function (newPrefix) {
        this.guidPrefix = newPrefix;
    }


    /**@public
     * @description Извлекает сертификат из контейнера и возвращает по нему подробную информацию.
     * @returns {IFCCertificateInfo} Объект содержит подробную информацию о сертификате.
     * */
    this.getCertificate = function (containerId) {
        if (!this.isValid())
            return null;

        return this.getCertificateInfo(containerId, IFCConst.IFC_CERT_LOAD_FROM_CONTAINER);
    }

    /**@public
     * @description Получает сертификат в виде строки base64 и возвращает по нему подробную информацию.
     * @returns {IFCCertificateInfo} Объект содержит подробную информацию о сертификате.
     * */
    this.getCertificateFromString = function (dataString) {
        if (!this.isValid())
            return null;

        return this.getCertificateInfo(dataString, IFCConst.IFC_CERT_LOAD_FROM_STRING);
    }

    // Methods for  hash computing

    /**@public
     * @description Вычисляет хеш для входной строки данных.
     * @returns {IFCHash} Объект содержит вычисленное значение хеша.
     * */
    this.getHash = function (containerId, data) {
        if (!this.isValid())
            return null;

        return this.getHashByDataType(containerId, IFCConst.IFC_DATATYPE_DATA, data);
    }

    /**@public
     * @description Декодирует из base64 входную строку данных, вычисляет для декодированной строки хеш.
     * @returns {IFCHash} Объект содержит вычисленное значение хеша.
     * */
    this.getHashFromBase64 = function (containerId, data) {
        if (!this.isValid())
            return null;

        return this.getHashByDataType(containerId, IFCConst.IFC_DATATYPE_DATA_BASE64, data);
    }

    // Methods for  data encryption and decryption

    /**@public
     * @description Не использовать, реализация требует уточнения.
     * @returns {IFCEncrypted} Объект содержит криптотекст и сессионный ключ.
     * */
    this.encrypt = function (containerId, userPin, data) {
        if (!this.isValid())
            return null;

        var crypto = this.getCryptoById(this.getCryptoIdByContainerId(containerId));

        if (!(userPin && userPin.length > 0) && crypto.isPKCS11()) {
            setLibraryError(IFCError.IFC_P11_INVALID_PIN_ERROR);
            return false;
        }

        var toEncrypt = Array();
        toEncrypt["data_base64"] = data;

        var encryptedData = Array();

        var peerCertificate = Array();
        var certificate = this.getCertificate(containerId).getBase64();

        if (ifcPlugin.getErrorCode() == 0) {
            peerCertificate["cert"] = peerCertificate["info"];

            var peerX509Handle = this.plugin().load_x509_from_data(peerCertificate, IFCConst.IFC_CERT_UNKNOWN);

            if (peer_x509_handle < 0)
                return null;

            var result;

            if (0 == this.plugin().encrypt(containerId, userPin, peerX509Handle, toEncrypt, encryptedData, encryptedKey)) {
                result = new IFCEncrypted(encryptedData["enc_data_base64"], encryptedKey["enc_key_base64"]);
            } else {
                return null;
            }

            this.plugin().free_x509(peerX509Handle);

            return result;
        } else {
            return null;
        }
    }

    /**@public
     * @description Не использовать, реализация требует уточнения.
     * @returns {IFCEncrypted} Объект содержит расшифрованный текст.
     * */
    this.decrypt = function (containerId, userPin, peerCertificate, encryptedData, encryptedKey) {
        if (!this.isValid())
            return null;

        var crypto = this.getCryptoById(this.getCryptoIdByContainerId(containerId));

        if (!(userPin && userPin.length > 0) && crypto.isPKCS11()) {
            setLibraryError(IFCError.IFC_P11_INVALID_PIN_ERROR);
            return false;
        }

        var x509Handle = this.plugin().load_x509_from_data(peerCertificate, IFCConst.IFC_CERT_UNKNOWN);
        if (x509Handle < 0)
            return null;

        var decryptedData = null;

        var rc = this.plugin().decrypt(containerId, userPin, x509Handle, encryptedData, encryptedKey, decryptedData);

        this.plugin().free_x509(peer_x509_handle);

        if (rc == 0) {
            return decryptedData['dec_data_base64'];
        } else {
            return null;
        }
    }

    /**@public
     * @description Не использовать, реализация требует уточнения.
     * @returns {String}
     * */
    this.getHashSignData = function (containerId, userPin, data) {
        if (!this.isValid())
            return null;

        var hashToSign = this.getHash(containerId, data).getPlainData();

        return this.signDataCMSAttached(containerId, userPin, hashToSign);
    }

    // Method for low-level access to cryptotokens or smart-cards

    /**@public
     *  @description Отправка подключенной смарт-карте или криптотокену APDU-команды.
     * @returns {String} Ответ на поданную команду от смарт-карты\криптотокена.
     * */
    this.sendAPDU = function (readerName, requestData) {
        if (!this.isValid())
            return new Array();

        var request = Array();
        request["apdu_string"] = requestData;

        var response = Array();

        if (0 == this.plugin().send_apdu(readerName, request, response)) {
            return response["resp_string"];
        } else {
            return null;
        }
    }
    // END - These methods are recommended to be used

    // BEGIN - These methods should not be used

    /**@private*/
    this.plugin = function () {
        return pluginObject;
    }
    /**@private*/
    this.getCertificates = function (cryptoObject) {
        if (!this.isValid())
            return new Array();

        var certList = new Array();
        var listSize = 0;
        var rc = 0;
        var info;

        listSize = this.plugin().get_list_certs_size(cryptoObject.getCryptoId());

        if (listSize < 1)
            return new Array();

        for (var i = 0; i < listSize; i++) {
            info = new Array();

            rc = this.plugin().get_list_certs(i, info);
            if (rc != 0)
                return new Array();

            certList[i] = new IFCCertificate(info, cryptoObject);
        }

        return certList;
    }

    /**@private*/
    this.getCryptoListByType = function (cryptoType) {
        if (!this.isValid())
            return new Array();

        var result = new Array();

        var listSize = 0;
        var rc = 0;
        var j = 0;

        listSize = this.plugin().get_list_info_size();

        if (listSize < 1)
            return new Array();

        for (var i = 0; i < listSize; i++) {
            var info = new Array();

            rc = this.plugin().get_list_info(i, info);
            if (rc != 0)
                return new Array();

            if (info['type'] == cryptoType || cryptoType == null) {
                result[j++] = new IFCCrypto(info);
            }
        }

        return result;
    }

    /**@private*/
    this.sign = function (containerId, pin, data, ifcDataType, ifcSignType) {
        if (!this.isValid())
            return null;

        var crypto = this.getCryptoById(this.getCryptoIdByContainerId(containerId));

        if (!crypto) {
            setLibraryError(IFCError.IFC_CONTAINER_NOT_FOUND);
            return null;
        }

        if (!(pin && pin.length > 0) && crypto.isPKCS11()) {
            setLibraryError(IFCError.IFC_P11_INVALID_PIN_ERROR);
            return null;
        }

        var sign = Array();
        var toSign = Array()
        switch (ifcDataType) {
            case IFCConst.IFC_DATATYPE_DATA:
                toSign['data'] = data;
                break;
            case IFCConst.IFC_DATATYPE_DATA_BASE64:
                toSign['data_base64'] = data;
                break;
            case IFCConst.IFC_DATATYPE_FILENAME:
                toSign['data_filename'] = data;
                break;
            default :
                setLibraryError(IFCError.IFC_BAD_SIGN_TYPE);
                break;
        }

        var signType = IFCConst.IFC_SOFTWARE_HASH;

        if ((IFCConst.IFC_DATATYPE_DATA == ifcDataType || IFCConst.IFC_DATATYPE_DATA_BASE64 == ifcDataType)
            && data.length < 1024) {
            signType = IFCConst.IFC_HARDWARE_HASH;
        }

        var rc = this.plugin().sign(containerId, pin, toSign, ifcDataType, signType, IFCConst.IFC_BASE64, ifcSignType, sign);

        if (rc == 0) {
            return sign['sign_base64'];
        } else {
            return null;
        }
    }

    /**@private*/
    this.verify = function (containerId, userPin, sign, signType, data, dataType, peerCertificate) {
        if (!this.isValid())
            return null;

        var x509Handle = 0;

        if (peerCertificate != null) {
            x509Handle = this.plugin().load_x509_from_data(peerCertificate, IFCConst.IFC_CERT_UNKNOWN);
            if (x509Handle < 0)
                return IFCError.IFC_GENERAL_ERROR;
        }

        var rc = this.plugin().verify(containerId, userPin,
            sign,
            signType,
            data,
            dataType,
            x509Handle);

        if (x509Handle != 0)
            this.plugin().free_x509(x509Handle);

        return rc;
    }

    /**@private*/
    this.getCertificateInfo = function (resourceId, resourceType) {
        if (!this.isValid())
            return null;

        var x509Handle;


        switch (resourceType) {
            case IFCConst.IFC_CERT_LOAD_FROM_CONTAINER:
                x509Handle = this.plugin().load_x509_from_container(resourceId);
                break;
            case IFCConst.IFC_CERT_LOAD_FROM_STRING:
                var certArray = Array();
                certArray['cert'] = resourceId;
                x509Handle = this.plugin().load_x509_from_data(certArray, IFCConst.IFC_CERT_UNKNOWN);
                break;
            case IFCConst.IFC_CERT_LOAD_FROM_FILE:
                x509Handle = this.plugin().load_x509_from_file(resourceId, IFCConst.IFC_CERT_UNKNOWN);
                break;
            default:
                return new Array();
                break;
        }

        var x509Info = new Array();

        var result = new Array();

        if (0 == this.plugin().info_x509(x509Handle, IFCConst.IFC_X509_INFO_CERT_BASE64ENCODED, x509Info)) {
            result['base64'] = x509Info['info'];
        } else {
            return null;
        }

        if (0 == this.plugin().info_x509(x509Handle, IFCConst.IFC_X509_INFO_CERT_SERIALNUMBER, x509Info)) {
            result['cert_sn'] = x509Info['info'];
        } else {
            return null;
        }

        if (0 == this.plugin().info_x509(x509Handle, IFCConst.IFC_X509_INFO_CERT_SUBJECT, x509Info)) {
            result['cert_subject'] = x509Info['info'];
        } else {
            return null;
        }

        if (0 == this.plugin().info_x509(x509Handle, IFCConst.IFC_X509_INFO_CERT_ISSUER, x509Info)) {
            result['cert_issuer'] = x509Info['info'];
        } else {
            return null;
        }

        if (0 == this.plugin().info_x509(x509Handle, IFCConst.IFC_X509_INFO_CERT_VALIDFROM, x509Info)) {
            result['cert_valid_from'] = x509Info['info'];
        } else {
            return null;
        }

        if (0 == this.plugin().info_x509(x509Handle, IFCConst.IFC_X509_INFO_CERT_VALIDTO, x509Info)) {
            result['cert_valid_to'] = x509Info['info'];
        } else {
            return null;
        }

        if (0 == this.plugin().info_x509(x509Handle, IFCConst.IFC_X509_INFO_CERT_PEM, x509Info)) {
            result['pem'] = x509Info['info'];
        } else {
            return null;
        }

        if (0 == this.plugin().info_x509(x509Handle, IFCConst.IFC_X509_INFO_CERT_VERSION, x509Info)) {
            result['version'] = x509Info['info'];
        } else {
            return null;
        }

        if (0 == this.plugin().info_x509(x509Handle, IFCConst.IFC_X509_INFO_CERT_X509EXTENSIONS, x509Info)) {
            result['extensions'] = x509Info['info'];
        } else {
            return null;
        }

        this.plugin().free_x509(x509Handle);

        return new IFCCertificateInfo(result);
    }


    /**@private*/
    this.getHashByDataType = function (containerId, dataType, data) {
        if (!this.isValid())
            return null;

        var hashValue = Array();

        var dataArray = Array();

        if (dataType == IFCConst.IFC_DATATYPE_DATA_BASE64) {
            dataArray['data_base64'] = data;
        } else {
            dataArray['data'] = data;
        }

        if (0 == this.plugin().hash(containerId, dataArray, dataType, IFCConst.IFC_BASE64, hashValue)) {
            return new IFCHash(hashValue['hash_base64']);
        } else {
            return null;
        }
    }

    this.generateKeyPairAndCsrExtended = function (containerId, userPin, subjectDN, extendedKeyUsage, certificatePolicies) {
        if (!this.isValid())
            return null;

        var dn = new IFCDN(subjectDN, IFCConst.DN_SEPARATOR_INPUT);

        if (0 != this.plugin().key_gen(containerId, userPin)) {
            return new IFCCertificateRequest(containerId, null);
        }

        var reqData = new Array();

        if (0 == this.plugin().req_gen(containerId, userPin,
            dn.getSubjectArray(),
            // 1.2.643.2.2.34.6 - OID Пользователь Центра Регистрации
            "clientAuth,emailProtection," + "1.2.643.2.2.34.6," + extendedKeyUsage,
            certificatePolicies,
            '',   // signInstrument - Нужно обсудить!
            IFCConst.IFC_REQ_BASE64ENCODED, reqData)) {
            return new IFCCertificateRequest(containerId, reqData["req_base64"]);
        } else {
            return new IFCCertificateRequest(containerId, null);
        }
    }

    var validatePin = function(pin) {
        if (pin && pin.match(/^[a-zA-Z0-9]{6,32}$/)) {
            return true;
        } else {
            setLibraryError(IFCError.IFC_P11_INVALID_PIN_ERROR);
            return false;
        }
    }

    var setLibraryError = function(errorCode) {
        isLastLibraryError = true;
        lastLibraryErrorCode = errorCode;
    }

    var clearLibraryError = function() {
        isLastLibraryError = false;
        lastLibraryErrorCode = 0;
    }

    // END - These methods should not be used
}

/**
 * @class IFCCrypto
 * @description Содержит информацию о криптоустройстве (криптотокен, смарт-карта или криптопровайдер).
 */
function IFCCrypto(resultData) {
    this.getAlias = function () {
        return IFCConst.emptyString(resultData["alias"]);
    }

    this.getName = function () {
        return IFCConst.emptyString(resultData["name"]);
    }

    this.isPKCS11 = function () {
        return (resultData["type"] == IFCConst.IFC_CRYPTO_PKCS11);
    }

    this.isCAPI = function () {
        return (resultData["type"] == IFCConst.IFC_CRYPTO_CAPI);
    }

    this.getPath = function () {
        return IFCConst.emptyString(resultData["path"]);
    }

    this.getNumber = function () {
        return IFCConst.emptyString(resultData["num"]);
    }

    this.getDescription = function () {
        return IFCConst.emptyString(resultData["description"]);
    }

    this.getSerialNumber = function () {
        return IFCConst.emptyString(resultData["serial_number"]);
    }

    this.getCryptoId = function () {
        if (resultData["type"] == IFCConst.IFC_CRYPTO_PKCS11)
            resultData["crypto_id"] = resultData["alias"] + "/" + resultData["num"];
        else if (resultData["type"] == IFCConst.IFC_CRYPTO_CAPI)
            resultData["crypto_id"] = resultData["alias"];

        return IFCConst.emptyString(resultData['crypto_id']);
    }

    // TODO make it private
    this.getExtendedKeyUsage = function () {
        var eku = "";

        switch (this.getAlias()) {
            case "JaCarta":
                eku = "1.2.643.3.205.110.1";
                break;
            case "ruTokenECP":
                eku = "1.2.643.3.205.110.7";
                break;
            case "CryptoPro":
                eku = "1.2.643.3.205.110.2";
                break;
            case "VIPNet":
                eku = "1.2.643.3.205.110.6";
                break;
            case "SignalCom":
                eku = "1.2.643.3.205.110.8";
                break;
            case "LISSI-CSP":
                eku = "1.2.643.3.205.110.9";
                break;
            default:
                eku = "";
                break;
        }

        return eku;
    }

    // TODO make it private
    this.getCertificatePolicies = function () {
        var cp = "";

        switch (this.getAlias()) {
            case "JaCarta":
                cp = IFCConst.OID_KC1 + "," + IFCConst.OID_KC2;
                break;
            case "ruTokenECP":
                cp = IFCConst.OID_KC1 + "," + IFCConst.OID_KC2;
                break;
            case "CryptoPro":
                cp = IFCConst.OID_KC1;
                break;
            case "VIPNet":
                cp = IFCConst.OID_KC1;
                break;
            case "SignalCom":
                cp = IFCConst.OID_KC1;
                break;
            default:
                cp = IFCConst.OID_KC1;
                break;
        }

        return cp;
    }
}

/**
 * @class IFCCertificate
 * @description Содержит информацию о сертификате ЭП.
 */
function IFCCertificate(info, crypto) {
    this.getSerialNumber = function () {
        return IFCConst.emptyString(info['cert_sn']);
    }

    this.getSubjectDN = function () {
        return new IFCDN(IFCConst.emptyString(info['cert_subject']), IFCConst.DN_SEPARATOR_PLUGIN);
    }

    this.getIssuerDN = function () {
        return new IFCDN(IFCConst.emptyString(info['cert_issuer']), IFCConst.DN_SEPARATOR_PLUGIN);
    }

    this.getValidFrom = function () {
        return IFCConst.emptyString(info['cert_valid_from']);
    }

    this.getValidTo = function () {
        return IFCConst.emptyString(info['cert_valid_to']);
    }

    this.isValid = function () {
        var date = new Date();
        var validTo = new Date(this.getValidTo());

        return date < validTo;
    }

    this.getId = function () {
        return IFCConst.emptyString(info['id']);
    }

    this.getContainerId = function () {
        return crypto.getCryptoId() + "/" + IFCConst.emptyString(info["id"]);
    }

    this.getCryptoId = function () {
        return crypto.getCryptoId();
    }

    this.isPKCS11 = function () {
        return crypto.isPKCS11();
    }

    this.isCAPI = function () {
        return crypto.isCAPI();
    }

    this.getName = function () {
        return IFCConst.emptyString(info['name']);
    }

    this.getDescription = function () {
        return IFCConst.emptyString(info['description']);
    }
}

/**
 * @class IFCCertificateInfo
 * @description Содержит подробную информацию о сертификате ЭП.
 */
function IFCCertificateInfo(info) {
    this.getSerialNumber = function () {
        return IFCConst.emptyString(info['cert_sn']);
    }

    this.getSubjectDN = function () {
        return new IFCDN(IFCConst.emptyString(info['cert_subject']), IFCConst.DN_SEPARATOR_PLUGIN);
    }

    this.getIssuerDN = function () {
        return new IFCDN(IFCConst.emptyString(info['cert_issuer']), IFCConst.DN_SEPARATOR_PLUGIN);
    }

    this.getValidFrom = function () {
        return IFCConst.emptyString(info['cert_valid_from']);
    }

    this.getValidTo = function () {
        return IFCConst.emptyString(info['cert_valid_to']);
    }

    this.isValid = function () {
        var date = new Date();
        var validTo = new Date(this.getValidTo());

        return date < validTo;
    }

    this.getBase64 = function () {
        return IFCConst.emptyString(info['base64']);
    }

    this.getPem = function () {
        return IFCConst.emptyString(info['pem']);
    }

    this.getVersion = function () {
        return IFCConst.emptyString(info['version']);
    }

    this.getExtensionsString = function () {
        return IFCConst.emptyString(info['extensions']);
    }

    /**@public
     * @description Возвращает сертификат ЭП в виде текста.
     * @returns {String} Строка, содержащая текстовое представление сертификата (переносы строк и символы табуляции).
     * */
    this.getPrintableText = function() {
        return this.getPrintable("\n", "\t", ", ");
    }

    /**@public
     * @description Возвращает сертификат ЭП в виде текста с html-разметкой.
     * @returns {String} Строка, содержащая текстовое представление сертификата (br и nbsp).
     * */
    this.getPrintableHTML = function() {
        return this.getPrintable("<br />", "&nbsp;&nbsp;", ", ");
    }

    /**@private*/
    this.getPrintable = function(cr, tab, sep) {
        if (!cr) {
            cr = "\n";
        }

        if (!tab) {
            tab = "\t";
        }

        if (!sep) {
            sep = ", ";
        }

        var certPrintable = "Номер квалифицированного сертификата: " + this.getSerialNumber() + cr +
            "Действие квалифицированного сертификата:" + cr +
            tab + tab + "с " + this.getValidFrom() + cr +
            tab + tab + "по " + this.getValidTo() + cr +
            cr +
            tab + "Сведения о владельце квалифицированного сертификата" + cr +
            cr +
            "Фамилия, имя, отчество: " + this.getSubjectDN().getCommonName() + cr +
            "Страховой номер индивидуального лицевого счета: " + this.getSubjectDN().getSNILS() + cr +
            cr +
            tab + "Сведения об издателе квалифицированного сертификата" + cr +
            cr +
            "Наименование  удостоверяющего  центра: " + this.getIssuerDN().getCommonName() + cr +
            "Место  нахождения  удостоверяющего центра: " + this.getIssuerDN().getCountryName() + sep +
            this.getIssuerDN().getStateOrProvinceName() + sep + this.getIssuerDN().getLocalityName() + sep +
            this.getIssuerDN().getStreetAddress() + cr;

        // Optional information in issuerDN
        if (this.getIssuerDN().getSurname()) {
            certPrintable += "Доверенное лицо удостоверяющего центра: " + this.getIssuerDN().getSurname();
        } else if (this.getIssuerDN().getGivenName()) {
            certPrintable += sep + this.getIssuerDN().getGivenName() + cr;
        } else {
            certPrintable += cr;
        }

        //TODO Extensions has to be parsed as other elements
        certPrintable += tab + "Расширения сертификата" + cr + cr +
            this.getExtensionsString().replace(/(\r\n|\n|\r)/gm, cr).replace(/^\s+/mg, tab);

        return certPrintable;
    }
}

/**
 * @class IFCDN
 * @description Содержит информацию о субъекте сертификата ЭП.
 */
function IFCDN(dnString, dnSeparator) {
    var getNumericOid = function (oid) {
        switch (oid.toLowerCase()) {
            case "commonname":
            case "cn":
                return IFCConst.OID_COMMON_NAME;
                break;
            case "surname":
                return IFCConst.OID_SURNAME;
                break;
            case "givenname":
                return IFCConst.OID_GIVEN_NAME;
                break;
            case "countryname":
            case "c":
                return IFCConst.OID_COUNTRY_NAME;
                break;
            case "stateorprovincename":
                return IFCConst.OID_STATE_OR_PROVINCE_NAME;
                break;
            case "localityname":
            case "l":
                return IFCConst.OID_LOCALITY_NAME;
                break;
            case "streetaddress":
            case "street":
                return IFCConst.OID_STREET_ADDRESS;
                break;
            case "organizationname":
            case "o":
                return IFCConst.OID_ORGANIZATION_NAME;
            case "organizationunitname":
            case "ou":
                return IFCConst.OID_ORGANIZATION_UNIT_NAME;
                break;
            case "title":
                return IFCConst.OID_TITLE;
                break;
            case "emailaddress":
            case "email":
                return IFCConst.OID_EMAIL_ADDRESS;
                break;
            case "ogrn":
                return IFCConst.OID_OGRN;
                break;
            case "snils":
                return IFCConst.OID_SNILS;
                break;
            case "inn":
                return IFCConst.OID_INN;
                break;
            default:
                return oid;
                break;
        }
    }

    var dnArray = dnString.split("\\,").join("[escaped_comma]").split(dnSeparator);
    var dnData = new Object();

    for (var i = 0; i < dnArray.length; i++) {
        var oidValue = dnArray[i].split("=");

        if (oidValue[1] == null) {
            oidValue[1] = "";
        }

        var oid = oidValue[0].trim();
        var value = oidValue[1].trim().split("[escaped_comma]").join(",");

        dnData[getNumericOid(oid)] = value;
    }

    this.getCommonName = function () {
        return IFCConst.emptyString(dnData[IFCConst.OID_COMMON_NAME]);
    }

    this.getSurname = function () {
        return IFCConst.emptyString(dnData[IFCConst.OID_SURNAME]);
    }

    this.getGivenName = function () {
        return IFCConst.emptyString(dnData[IFCConst.OID_GIVEN_NAME]);
    }

    this.getCountryName = function () {
        return IFCConst.emptyString(dnData[IFCConst.OID_COUNTRY_NAME]);
    }

    this.getStateOrProvinceName = function () {
        return IFCConst.emptyString(dnData[IFCConst.OID_STATE_OR_PROVINCE_NAME]);
    }

    this.getLocalityName = function () {
        return IFCConst.emptyString(dnData[IFCConst.OID_LOCALITY_NAME]);
    }

    this.getStreetAddress = function () {
        return IFCConst.emptyString(dnData[IFCConst.OID_STREET_ADDRESS]);
    }

    this.getOrganizationName = function () {
        return IFCConst.emptyString(dnData[IFCConst.OID_ORGANIZATION_NAME]);
    }

    this.getOrganizationUnitName = function () {
        return IFCConst.emptyString(dnData[IFCConst.OID_ORGANIZATION_UNIT_NAME]);
    }

    this.getTitle = function () {
        return IFCConst.emptyString(dnData[IFCConst.OID_TITLE]);
    }

    this.getEmailAddress = function () {
        return IFCConst.emptyString(dnData[IFCConst.OID_EMAIL_ADDRESS]);
    }

    this.getOGRN = function () {
        return IFCConst.emptyString(dnData[IFCConst.OID_OGRN]);
    }

    this.getSNILS = function () {
        return IFCConst.emptyString(dnData[IFCConst.OID_SNILS]);
    }

    this.getINN = function () {
        return IFCConst.emptyString(dnData[IFCConst.OID_INN]);
    }

    this.getValueByOid = function (oid) {
        return IFCConst.emptyString(dnData[getNumericOid(oid)]);
    }

    this.getSubjectArray = function () {
        var dnArray = new Array();

        var oidsCount = 0;

        for (var dnKey in dnData) {
            oidsCount++;

            dnArray["oid_" + oidsCount] = dnKey;
            dnArray["oid_type_" + oidsCount] = IFCConst.getDNDataType(dnKey);
            dnArray["value_" + oidsCount] = dnData[dnKey];
        }

        dnArray["oids_count"] = oidsCount;

        return dnArray;
    }
}

/**
 * @class IFCCertificateRequest
 * @description Содержит значение запроса на выпуск сертификата (CSR).
 */
function IFCCertificateRequest(containerId, csr) {
    this.getContainerId = function () {
        return containerId;
    }

    this.getCsr = function () {
        return csr;
    }
}

/**
 * @class IFCEncrypted
 * @description Содержит зашифрованные данные и ключ обмена.
 */
function IFCEncrypted(encryptedData, encryptedKey) {
    this.data = encryptedData;
    this.key = encryptedKey;

    this.getData = function () {
        return this.data;
    }

    this.getKey = function () {
        return this.key;
    }
}

/**
 * @class IFCHash
 * @description Содержит зашифрованные данные и ключ обмена.
 */
function IFCHash(hashBase64) {
    this.getBase64 = function () {
        return hashBase64;
    }

    this.getHexBinary = function () {
        return binStringToHex(decodeBase64(hashBase64));
    }

    this.getPlainData = function () {
        return decodeBase64(hashBase64);
    }

    // private methods

    /**@private*/
    var decodeBase64 = function (s) {
        var e = {}, i, k, v = [], r = '', w = String.fromCharCode;
        var n = [
            [65, 91],
            [97, 123],
            [48, 58],
            [43, 44],
            [47, 48]
        ];

        for (z in n) {
            for (i = n[z][0]; i < n[z][1]; i++) {
                v.push(w(i));
            }
        }
        for (i = 0; i < 64; i++) {
            e[v[i]] = i;
        }

        for (i = 0; i < s.length; i += 72) {
            var b = 0, c, x, l = 0, o = s.substring(i, i + 72);
            for (x = 0; x < o.length; x++) {
                c = e[o.charAt(x)];
                b = (b << 6) + c;
                l += 6;
                while (l >= 8) {
                    r += w((b >>> (l -= 8)) % 256);
                }
            }
        }
        return r;
    }

    /**@private*/
    var binStringToHex = function (s) {
        var s2 = [], c;
        var result = "";
        for (var i = 0, l = s.length; i < l; ++i) {
            c = s.charCodeAt(i);
            s2.push(
                (c >> 4 ).toString(16),
                (c & 0xF ).toString(16));
        }
        String.prototype.concat.apply('', s2);

        for (var i = 0; i < s2.length; i++) {
            result += s2[i];
        }

        return result;
    }
    // end of private methods
}

/**
 * @class IFCConst
 * @description Содержит константы конфигурации для вызова функций плагина.
 */
var IFCConst = {
    // Input data types
    IFC_DATATYPE_DATA: 1,
    IFC_DATATYPE_DATA_BASE64: 2,
    IFC_DATATYPE_HASH: 3,
    IFC_DATATYPE_HASH_BASE64: 4,
    IFC_DATATYPE_FILENAME: 5,

    // CryptoAPI Definitions
    IFC_CRYPTO_PKCS11: "pkcs11",
    IFC_CRYPTO_CAPI: "capi",

    // SubjectDN OID definitions
    OID_COMMON_NAME: "2.5.4.3",
    OID_SURNAME: "2.5.4.4",
    OID_GIVEN_NAME: "2.5.4.42",
    OID_COUNTRY_NAME: "2.5.4.6",
    OID_STATE_OR_PROVINCE_NAME: "2.5.4.8",
    OID_LOCALITY_NAME: "2.5.4.7",
    OID_STREET_ADDRESS: "2.5.4.9",
    OID_ORGANIZATION_NAME: "2.5.4.10",
    OID_ORGANIZATION_UNIT_NAME: "2.5.4.11",
    OID_TITLE: "2.5.4.12",
    OID_EMAIL_ADDRESS: "1.2.840.113549.1.9.1",

    // Russian custom SubjectDN OID definitions
    OID_OGRN: "1.2.643.100.1",
    OID_SNILS: "1.2.643.100.3",
    OID_INN: "1.2.643.3.131.1.1",

    // Certificate Policies OID definitions
    OID_KC1: "1.2.643.100.113.1",
    OID_KC2: "1.2.643.100.113.2",
    OID_KC3: "1.2.643.100.113.3",


    // DN definitions
    DN_SEPARATOR_PLUGIN: "\n",
    DN_SEPARATOR_INPUT: ",",

    // Certificate retrieval types
    IFC_CERT_LOAD_FROM_CONTAINER: 1,
    IFC_CERT_LOAD_FROM_FILE: 2,
    IFC_CERT_LOAD_FROM_STRING: 3,

    // Signature types
    IFC_SIGNTYPE_SIMPLE: 1,
    IFC_SIGNTYPE_SIMPLE_REVERSE: 2,
    IFC_SIGNTYPE_PKCS7ATTACHED: 3,
    IFC_SIGNTYPE_PKCS7DETACHED: 4,

    // Hashing type for PKCS#11
    IFC_HARDWARE_HASH: 1,
    IFC_SOFTWARE_HASH: 2,

    // Output format
    IFC_BASE64: 1,
    IFC_RAW: 0,

    // Certificate info types
    IFC_X509_INFO_CERT_BASE64ENCODED: 1,
    IFC_X509_INFO_CERT_DER: 2,
    IFC_X509_INFO_CERT_VERSION: 3,
    IFC_X509_INFO_CERT_SERIALNUMBER: 4,
    IFC_X509_INFO_CERT_SUBJECT: 5,
    IFC_X509_INFO_CERT_ISSUER: 6,
    IFC_X509_INFO_CERT_VALIDFROM: 7,
    IFC_X509_INFO_CERT_VALIDTO: 8,
    IFC_X509_INFO_CERT_X509EXTENSIONS: 9,
    IFC_X509_INFO_CERT_PEM: 10,

    // Certificate data types
    IFC_CERT_UNKNOWN: 0,
    IFC_CERT_DER: 1,
    IFC_CERT_BASE64: 2,
    IFC_CERT_PEM: 3,

    // Certificare Request types
    IFC_REQ_DER: 0,
    IFC_REQ_PEM: 1,
    IFC_REQ_BASE64ENCODED: 2,

    // P11 PIN Types
    P11_PIN_TYPE_USER: 0,
    P11_PIN_TYPE_ADMIN: 1,

    // ASN.1 Object types
    IFC_PRINTABLE_STRING: 19,
    IFC_IA5STRING: 22,
    IFC_NUMERICSTRING: 18,
    IFC_UTF8STRING: 12,
    IFC_OCTET_STRING: 4,
    IFC_BMPSTRING: 30,

    // APDU input formats
    APDU_FORMAT_RAW: 0,
    APDU_FORMAT_TEXT: 1,

    // Visualization methods
    SHOW_SAFETOUCH: 0,

    getDNDataType: function (oidName) {
        var dataTypeValue;

        switch (oidName) {
            case this.OID_COUNTRY_NAME:
                dataTypeValue = this.IFC_PRINTABLE_STRING;
                break;
            case this.OID_SNILS:
            case this.OID_OGRN:
            case this.OID_INN:
                dataTypeValue = this.IFC_NUMERICSTRING;
                break;
            case this.OID_EMAIL_ADDRESS:
                dataTypeValue = this.IFC_IA5STRING;
                break;
            default:
                dataTypeValue = IFCConst.IFC_UTF8STRING;
                break;
        }

        return dataTypeValue;
    },


    emptyString: function(str) {
        if (str == undefined || str == null) {
            return "";
        }

        return str;
    }
};

/**
 * @class IFCError
 * @description Содержит константы кодов ошибок, возвращаемых плагином и библиотекой.
 */
var IFCError = {
    // Plugin Errors
    IFC_GENERAL_ERROR: -1,
    IFC_OK: 0x0000,
    IFC_ERROR_UNKNOWN: 0x0001,
    IFC_ERROR_CONFIG: 0x0002,
    IFC_ERROR_RECORD_MAX: 0x0003,
    IFC_ERROR_CONFIG_EMPTY: 0x0004,
    IFC_BAD_PARAMS: 0x0005,
    IFC_ERROR_MALLOC: 0x0006,
    IFC_ALIAS_NOT_FOUND: 0x0007,
    IFC_ERROR_STORE: 0x0008,
    IFC_CERT_NOT_FOUND: 0x0009,
    IFC_CONTAINER_NOT_FOUND: 0x000A,
    IFC_UNSUPPORTED_FORMAT: 0x000B,
    IFC_KEY_NOT_FOUND: 0x000C,
    IFC_BAD_IN_TYPE: 0x000D,
    IFC_BAD_SIGN_TYPE: 0x000E,
    IFC_BAD_HASH_CONTEXT: 0x000F,
    IFC_BAD_TYPE_PIN: 0x0010,
    IFC_NOT_SUPPORTED: 0x0011,
    IFC_SLOT_NOT_INIT: 0x0012,
    IFC_ERROR_VERIFY: 0x0013,
    IFC_ERROR_BASE64: 0x0014,
    IFC_SC_ERROR: 0x0015,
    IFC_ENGINE_ERROR: 0x0016,
    IFC_P11_ERROR: 0x0017,
    IFC_P11_NO_TOKENS_FOUND: 0x0019,
    IFC_P11_LOGIN_ERROR: 0x00A0, // Equals to CKR_PIN_INCORRECT
    IFC_UNICODE_ERROR: 0x00A1,
    IFC_ENCODINGS_ERROR: 0x00A2,
    IFC_INIT_ERROR: 0x00A3,

    // Library errors
    IFC_PLUGIN_UNDEFINED_ERROR: 0x00A4,
    IFC_P11_INVALID_PIN_ERROR: 0X00A5,

    getErrorDescription: function (error_code) {
        switch (error_code) {
            // Plugin errors
            case IFCError.IFC_GENERAL_ERROR:
                return "Общая ошибка";
            case IFCError.IFC_OK:
                return "Операция завершена успешно";
            case IFCError.IFC_ERROR_UNKNOWN:
                return "Ошибка не определена";
            case IFCError.IFC_ERROR_CONFIG:
                return "Ошибка конфигурации";
            case IFCError.IFC_ERROR_RECORD_MAX:
                return "Достигнуто максимальное количество записей конфигурации";
            case IFCError.IFC_ERROR_CONFIG_EMPTY:
                return "Конфигурация не опеределена";
            case IFCError.IFC_BAD_PARAMS:
                return "Параметры заданы неверно";
            case IFCError.IFC_ERROR_MALLOC:
                return "Ошибка выделения памяти";
            case IFCError.IFC_ALIAS_NOT_FOUND:
                return "Указанный поставщик криптографии не найден";
            case IFCError.IFC_ERROR_STORE:
                return "Ошибка работы с хранилищем";
            case IFCError.IFC_CERT_NOT_FOUND:
                return "Сертификат не найден";
            case IFCError.IFC_CONTAINER_NOT_FOUND:
                return "Ключевой контейнер не найден";
            case IFCError.IFC_UNSUPPORTED_FORMAT:
                return "Формат не поддерживается";
            case IFCError.IFC_KEY_NOT_FOUND:
                return "Ключ не найден";
            case IFCError.IFC_BAD_IN_TYPE:
                return "Тип входных данных задан неверно";
            case IFCError.IFC_BAD_SIGN_TYPE:
                return "Тип электронной подписи задан неверно";
            case IFCError.IFC_BAD_HASH_CONTEXT:
                return "Контекст хеширования не найден";
            case IFCError.IFC_BAD_TYPE_PIN:
                return "Тип пин-кода задан неверно";
            case IFCError.IFC_NOT_SUPPORTED:
                return "Операция не поддерживается";
            case IFCError.IFC_SLOT_NOT_INIT:
                return "Слот не инициализирован";
            case IFCError.IFC_ERROR_VERIFY:
                return "Ошибка проверки подписи";
            case IFCError.IFC_ERROR_BASE64:
                return "Ошибка кодировки BASE64";
            case IFCError.IFC_SC_ERROR:
                return "Ошибка подсистемы смарт-карт";
            case IFCError.IFC_ENGINE_ERROR:
                return "Ошибка работы с библиотеки интерфейса";
            case IFCError.IFC_P11_ERROR:
                return "Ошибка работы с библиотекой PKCS#11";
            case IFCError.IFC_P11_NO_TOKENS_FOUND:
                return "Смарт-карта не найдена";
            case IFCError.IFC_P11_LOGIN_ERROR:
                return "Неверный пин-код";
            case IFCError.IFC_UNICODE_ERROR:
                return "Ошибка работы с UNICODE";
            case IFCError.IFC_ENCODINGS_ERROR:
                return "Ошибка кодировки";
            case IFCError.IFC_INIT_ERROR:
                return "Ошибка инициализации плагина";

            // Library errors
            case IFCError.IFC_PLUGIN_UNDEFINED_ERROR:
                return "Ошибка инициализации объекта плагина";
            case IFCError.IFC_P11_INVALID_PIN_ERROR:
                return "Пин-код не соответствует требованиям";

            // default
            default:
                return "Неизвестная ошибка";
        }
    }
}

// trim fix
if (typeof String.prototype.trim !== 'function') {
    String.prototype.trim = function () {
        return this.replace(/^\s+|\s+$/g, '');
    }
}
