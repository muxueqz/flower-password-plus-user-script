// ==UserScript==
// @name         Flower Password Plus
// @name:zh-CN   花密Plus
// @namespace    https://github.com/muxueqz/flower-password-plus-user-script
// @version      0.6.0
// @author       徐小花, Johnny Jian, xLsDg
// @description  花密 Flower Password - 可记忆的密码管理方案
// @homepageURL  https://github.com/muxueqz/flower-password-plus-user-script
// @icon         https://cdn.jsdelivr.net/gh/xlsdg/flower-password-user-script/icon.png
// @updateURL    https://cdn.jsdelivr.net/gh/xlsdg/flower-password-user-script/flowerpassword.user.js
// @downloadURL  https://cdn.jsdelivr.net/gh/xlsdg/flower-password-user-script/flowerpassword.user.js
// @supportURL   https://github.com/xlsdg/flower-password-user-script/issues
// @include      http://*
// @include      https://*
// @match        http://*/*
// @match        https://*/*
// @require      https://cdn.jsdelivr.net/npm/jquery/dist/jquery.min.js
// @require      https://cdn.jsdelivr.net/npm/fpcode@2.0.0/dist/flowerpassword.umd.js
// @require      https://cdn.jsdelivr.net/npm/punycode@1.4.1/punycode.min.js
// @require      https://cdn.jsdelivr.net/gh/gorhill/publicsuffixlist.js@1.0.0/publicsuffixlist.min.js
// @resource     FP_STYLE https://cdn.jsdelivr.net/gh/xlsdg/flower-password-user-script/fp.min.css
// @resource     PUBLIC_SUFFIX_LIST https://publicsuffix.org/list/public_suffix_list.dat
// @run-at       document-end
// @grant        GM_getResourceText
// @grant        GM_addStyle
// @grant        GM_setClipboard
// @license      MIT License
// @encoding     utf-8
// ==/UserScript==

;(function () {
  'use strict'

  var currentField = null

  function seek_password(hash) {
    // generate alphabet
    var lower = 'abcdefghijklmnopqrstuvwxyz'.split('')
    var upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')
    var number = '0123456789'.split('')
    var punctuation = ',.:;!?'.split('')
    var alphabet = lower.concat(upper).concat(number).concat(punctuation)
    // try to generate password
    for (var i = 0; i <= hash.length - 10; ++i) {
      var sub_hash = hash.slice(i, i + 10).split('')
      var count = 0
      var map_index = sub_hash.map(function (c) {
        count = (count + c.charCodeAt()) % alphabet.length
        return count
      })
      var sk_pwd = map_index.map(function (k) {
        return alphabet[k]
      })
      // validate password
      var matched = [false, false, false, false]
      sk_pwd.forEach(function (e) {
        matched[0] = matched[0] || lower.includes(e)
        matched[1] = matched[1] || upper.includes(e)
        matched[2] = matched[2] || number.includes(e)
        matched[3] = matched[3] || punctuation.includes(e)
      })
      if (!matched.includes(false)) {
        return sk_pwd.join('')
      }
    }
    return ''
  }

  function generate_seekpassword(pwd, key) {
    if (pwd && key) {
      var fl_passwd = fpCode(pwd, key)

      var code1 = fl_passwd.slice(0, 1)
      if (isNaN(code1)) {
        var hash = fl_passwd.slice(0, 16)
      } else {
        var hash = 'K' + fl_passwd.slice(1, 16)
      }
      console.assert(hash.length === 32, 'flower_password output length not equal to 32')
      var sk_pwd = seek_password(hash)
      return sk_pwd
    }
  }

  function setupInputListeners() {
    function insideBox(e) {
      return e.parents('#flower-password-input').length > 0
    }

    var lstPublicSuffix = GM_getResourceText('PUBLIC_SUFFIX_LIST')
    publicSuffixList.parse(lstPublicSuffix, punycode.toASCII)

    var hostname = location.hostname.toLowerCase()
    var domain = publicSuffixList.getDomain(hostname)
    var suffix = publicSuffixList.getPublicSuffix(hostname)

    $(document).on('focus', 'input:password', function () {
      if (insideBox($(this))) {
        return
      }

      lazyInject()

      if (currentField && currentField.get(0) != this) {
        $('#flower-password-password, #flower-password-key, #seekpassword-toggle').val('')
      }

      currentField = $(this)

      var offset = currentField.offset()
      var height = currentField.outerHeight()
      $('#flower-password-input')
        .css({
          left: offset.left + 'px',
          top: offset.top + height + 'px',
        })
        .show()

      var code = ''
      var key = domain.replace('.' + suffix, '') + code
      $('#flower-password-key').val(key)
    })

    $(document).on('focus', 'input:not(:password)', function () {
      if (insideBox($(this))) {
        return
      }
      $('#flower-password-input').hide()
    })
  }

  function isInjected() {
    return $('#flower-password-input').length > 0
  }

  function lazyInject() {
    if (isInjected()) {
      return
    }

    var style = GM_getResourceText('FP_STYLE')
    GM_addStyle(style)

    var html =
      '<div id="flower-password-input" style="display: none;">' +
      '<span id="flower-password-close" title="关闭">关闭</span>' +
      '<h1>花密 Flower Password</h1>' +
      '<label for="flower-password-password">记忆密码</label><input id="flower-password-password" name="flower-password-password" type="password" value=""/>' +
      '<br/>' +
      '<label for="flower-password-key">区分代号</label><input id="flower-password-key" name="flower-password-key" type="text" value=""/>' +
      `
  <!-- 增加启用/禁用 seekpassword 的开关 -->
<label>密码类型</label>
<label>
  <input id="seekpassword-toggle-a" name="seekpassword-toggle" type="radio" value="FlowerPassword" checked>
Flower
</label>

<label>
  <input id="seekpassword-toggle-b" name="seekpassword-toggle" type="radio" value="SeekPassword">
Seek
</label>
        ` +
      '<p id="flower-password-hint">· 记忆密码：可选择一个简单易记的密码，用于生成其他高强度密码。<br/>· 区分代号：用于区别不同用途密码的简短代号，如淘宝账号可用“taobao”或“tb”等。<br/>· 按Enter键或Esc键关闭本窗口。<br/>· 花密官网地址：<a href="https://flowerpassword.com/" target="_blank">https://flowerpassword.com/</a></p>' +
      '</div>'
    $('body').append(html)

    var onChange = function () {
      var password = $('#flower-password-password').val()
      var key = $('#flower-password-key').val()
      var selectedOption = $('input[name="seekpassword-toggle"]:checked').val() // 获取选中的单选按钮的值

      var action = fpCode
      if (selectedOption === 'SeekPassword') {
        action = generate_seekpassword
      }

      var result = action(password, key)
      if (result) {
        currentField.val(result)
        GM_setClipboard(result)
      }
    }
    // 在复选框的状态更改时触发 onChange 函数
    $('input[name="seekpassword-toggle"]').change(onChange)

    $('#flower-password-password, #flower-password-key')
      .change(onChange)
      .keyup(onChange)
      .keyup(function (e) {
        if (e.which === 13 || e.which === 27) {
          currentField.focus()
          $('#flower-password-input').hide()
        }
      })

    $('#flower-password-close').click(function () {
      $('#flower-password-input').hide()
    })
  }

  setupInputListeners()
})()
