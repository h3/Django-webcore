$(function(){

    $.frontadmin = (function(){
        var $self = this
        
        $self.states = {
            initialized: false,
            toolbars_visibles: false,
            active_frame: false
        }

        $self.bar = $('#frontadmin-bar-frame')
        $self.toolbars = $('.frontadmin-toolbar-frame')

        $self.buttons = {
            logout: '#frontadmin-btn-logout',
            toggle: '#frontadmin-btn-toggle',
            deleteObject: '#frontadmin-delete-object',
            changeObject: '#frontadmin-change-object',
            objectHistory: '#frontadmin-history-object',
        }

        $self.cookie = function(k, v) {
            if (v) { return $.cookie(k, v, {path: '/'}) }
            else   { return $.cookie(k,    {path: '/'}) }
        }

        // frontadmin toolbar initial state
        if ($self.cookie('frontadmin_toolbars_visibles') == null) { 
            // Cookie does not exist, set it and show the toolbar by default
            $self.cookie('frontadmin_toolbars_visibles', true)
            $self.states.toolbars_visibles = true
        }
        else if ($self.cookie('frontadmin_toolbars_visibles') == 'true') {
            $self.states.toolbars_visibles = true
        }
        else {
            $self.states.toolbars_visibles = false
        }

        $self.closeActiveFrame = function() {
            $self.states.active_frame.parent().fadeOut(function(){
                $(this).remove()
            })
        }

        // Remove toolbars and useless stuff in window mode
        $self.cleanDocument = function(d) {
            // add cancel button
            var $this  = this;
            var cancel = $('<li class="cancel-button-container"><a class="cancel-link" href="#">Cancel</a></li>')
            cancel.find('a').bind('click.adminToolbar', function() {
                if (!$self.states.active_frame.hasClass('modified') || confirm('Close and discard modifications ?')) {
                    $self.closeActiveFrame()
                }
            })

            d.find('#header, #breadcrumbs').remove().end()
             .find('body').css({paddingTop: 0}).end()
             .find('.module.footer')
                 .css({
                      '-moz-border-radius': '0 0 4px 4px',
                      '-webkit-border-radius': '0 0 4px 4px',
                      'border-radius': '0 0 4px 4px'
                  })
                 .find('.submit-row').append(cancel).end()
                 .find('input[name="_continue"]').bind('click', function() {
                     $self.states.active_frame.addClass('saving continue')
                 }).end()
                 .find('input[name="_save"]').bind('click', function() {
                     $self.states.active_frame.addClass('saving')
                 }).end()
                 .find('.delete-link').bind('click', function() {
                     $self.states.active_frame.addClass('deleting')
                 }).end()
                 .find('input[name="_addanother"]').parent().hide().end().end()
             .end() 
        }

        $self.events = {

            // Readjust bar & toolbars on window resize
            onWindowResize: function(e) {
                $self.toolbars.each(function(){
                    $(this).width($(this).parent().width())
                })
                var ww = $(document).width()
                var w =  parseInt(ww / 3)
                // Min width
                if (w < 300) { w = 300 }

                $self.bar.width(w)
                    .css('margin-left', ww / 2 - (w / 2))
            },
            
            // Log the user out and hide frontadmin
            onLogout: function(e){
                $.get($(this).attr('href'), function(){
                    $self.toolbars.each(function(){
                        var wrapper = $(this).parents('.front-admin-block')
                        wrapper.find('.frontadmin-toolbar-frame').slideUp('fast', function(){
                                $(this).remove()
                            }).end().find('*').unwrap()
                        wrapper.remove()
                    })
                    $self.bar.slideDown('fast', function(){
                        $(this).remove()
                    })
                })
                return false
            },                

            // toggle frontadmin ui
            onToggleToolbar: function(e){
                $('html').toggleClass('frontadmin-show-toolbars')
                var show = $('html').hasClass('frontadmin-show-toolbars')
                $(this)[show && 'addClass' || 'removeClass']('active')
                $self.cookie('frontadmin_toolbars_visibles', show && 'true' || 'false')
                $self.states.toolbars_visibles = show
                $self.cookie('frontadmin_toolbars_visibles', show && true || false)
                return false;
            },

            onObjectChange: function(){
                var url = $(this).attr('href')
                var el = $(this)
                var bd = $(this).parents('body')
                var block = $("#frontadmin-"+ bd.find('#app_label').val() 
                              +"-"+ bd.find('#object_name').val() 
                              +"-"+ bd.find('#object_id').val())
                var content = block.find('.frontadmin-block-content')

                // Open iframe window
                $self.states.active_frame = $.iframeWindow(url, function() {
                    var frame  = $(this)
                    var doc    = frame.contents()
                    var msg    = doc.find('#container > .messagelist')
                    var url    = document.location.href + ' #'+ block.attr('id')
                    var errors = doc.find('.errornote').get(0)

                    $self.cleanDocument(doc)

                    // Save button has been clicked
                    if ($(this).hasClass('saving')) {
                        if (!errors) {
                            if (!frame.hasClass('continue')) {
                                $self.closeActiveFrame()
                            }
                            content.load(url, function() {
                                content.find('.frontadmin-toolbar-frame').remove()
                                content = $(this).children().unwrap()
                                //$self.bindToolbarEvents(content.parent().find('iframe'))
                                //$.frontendMessage(msg.find('li:first').text())
                            })
                        }
                        frame.removeClass('saving').removeClass('continue')
                    }
                    else if ($(this).hasClass('deleting')) {
                        // Delete button has been clicked
                        // User can now either cancel or confirm
                        var cancel = doc.find('.left.cancel-button-container').removeClass('left').remove()
                        doc.find('.cancel-button-container').replaceWith(cancel)
                        doc.find('.cancel-link').unbind('click')
                            .bind('click.adminToolbar', function(){
                                frame.removeClass('deleting').removeClass('deleted')
                            }).end().remove()
                        // Confirm delete
                        doc.find('.footer input[type=submit]').bind('click.adminToolbar', function() {
                            frame.removeClass('deleting').addClass('deleted')
                        })

                    }
                    else if (frame.hasClass('deleted')) {
                        frame.removeClass('deleted')
                        var errors = doc.find('.errornote').get(0)
                        if (!errors) {
                            $self.closeActiveFrame()
                            $.frontendMessage(msg.find('li:first').text())
                            block.slideUp('slow', function() {
                                $(this).remove()
                            })
                        }
                    }
                    else {
                        msg.find('li').css('border', 0)
                    }
                })
                return false
            },

            // Triggered when a toolbar delete button is clicked
            onObjectDelete: function() {
                var url = $(this).attr('href')
                var el = $(this)
                var bd = $(this).parents('body')
                var block = $("#frontadmin-"+ bd.find('#app_label').val() +"-"+ bd.find('#object_name').val() +"-"+ bd.find('#object_id').val())

                $self.states.active_frame = $.iframeWindow(url, function() {
                    var frame  = $(this)
                    var doc    = frame.contents()
                    var msg    = doc.find('#container > .messagelist')
                    var url    = document.location.href + ' #'+ block.attr('id')
                    var errors = doc.find('.errornote').get(0)

                    $self.cleanDocument(doc)

                    if (frame.hasClass('deleted')) {
                        frame.removeClass('deleted')
                        var errors = doc.find('.errornote').get(0)
                        if (!errors) {
                            $self.closeActiveFrame()
                            //$.frontendMessage(msg.find('li:first').text())
                            block.slideUp('slow', function() {
                                $(this).remove()
                            })
                        }
                    }
                    else {
                        var cancel = doc.find('.left.cancel-button-container').removeClass('left').remove()
                        doc.find('.cancel-button-container').replaceWith(cancel)
                        doc.find('.cancel-link').unbind('click')
                            .bind('click.adminToolbar', function(){
                                frame.removeClass('deleting').removeClass('deleted')
                                $self.closeActiveFrame()
                            }).end().remove()
                        // Confirm delete
                        doc.find('.footer input[type=submit]').bind('click.adminToolbar', function() {
                            frame.removeClass('deleting').addClass('deleted')
                        })
                    }
                })
                return false
            },

            // Triggered when a toolbar historybutton is clicked
            onObjectHistory: function() {
                var url = $(this).attr('href')
                var el = $(this)
                var bd = $(this).parents('body')
                var ft = $([
                    '<div class="module footer">',
                        '<ul class="submit-row">',
                            '<li class="cancel-button-container"><a href="#" class="cancel-link">Close</a></li>',
                        '</ul><br clear="all">',
                    '</div>'].join(''))
                $self.states.active_frame = $.iframeWindow(url, function() {
                    var frame  = $(this)
                    var doc    = frame.contents()
                    var msg    = doc.find('#container > .messagelist')
                    var errors = doc.find('.errornote').get(0)

                    $self.cleanDocument(doc)

                    doc.find('body').append(ft)
                    doc.find('.cancel-button-container').bind('click', function(){
                        $self.closeActiveFrame()
                    })

                    /*
                    if (frame.hasClass('deleted')) {
                        frame.removeClass('deleted')
                        var errors = doc.find('.errornote').get(0)
                        if (!errors) {
                            $self.closeActiveFrame()
                            //$.frontendMessage(msg.find('li:first').text())
                            block.slideUp('slow', function() {
                                $(this).remove()
                            })
                        }
                    }
                    else {
                        var cancel = doc.find('.left.cancel-button-container').removeClass('left').remove()
                        doc.find('.cancel-button-container').replaceWith(cancel)
                        doc.find('.cancel-link').unbind('click')
                            .bind('click.adminToolbar', function(){
                                frame.removeClass('deleting').removeClass('deleted')
                                $self.closeActiveFrame()
                            }).end().remove()
                        // Confirm delete
                        doc.find('.footer input[type=submit]').bind('click.adminToolbar', function() {
                            frame.removeClass('deleting').addClass('deleted')
                        })
                    }*/
                })
                return false
            }
        }

        $self.bindBarEvents = function() {
            var doc = $self.bar.contents()
            doc.find($self.buttons.logout).bind('click.frontadmin', $self.events.onLogout).end()
               .find($self.buttons.toggle).bind('click.frontadmin', $self.events.onToggleToolbar).end()
        }
        
        $self.bindToolbarEvents = function(toolbar) {
            function bind(tb){
                var doc = $(tb).contents()
                doc.find($self.buttons.deleteObject).bind('click.frontadmin', $self.events.onObjectDelete).end()
                   .find($self.buttons.changeObject).bind('click.frontadmin', $self.events.onObjectChange).end()
                   .find($self.buttons.objectHistory).bind('click.frontadmin', $self.events.onObjectHistory).end()
            }
            if (toolbar) {
                bind(toolbar)
            }
            else {
                $.each($self.toolbars, function(){
                    bind(this)
                })
            }
        }

        return {
            init: function() {
                $self.events.onWindowResize()
                $(window).resize($self.events.onWindowResize)

                // Little trick to load iframe content locally
                $self.bar.add($self.toolbars).each(function(){
                    $(this).contents().find('body').html($(this).text())
                })

                $self.bindBarEvents()
                $self.bindToolbarEvents()

                $('html')[($self.states.toolbars_visibles == true && 'addClass' || 'removeClass')]('frontadmin-show-toolbars')
                $self.states.initialized = true
            }
        }
    })()

    $.frontadmin.init()

    $.iframeWindow = function(src, callback, option) {
        var options  = options || {}
        var callback = callback || function(){}
        var iframe   = $('<iframe frameborder="0" />').attr('src', src).load(callback)
        var wrapper  = $('<div id="frontadmin-iframe-window">').append(iframe)

        wrapper.css({
            position: 'fixed',
            top: 50,
            left: 50,
            right: 50,
            bottom: 50,
            zIndex: 99999
        }).appendTo('body')
          
        var resize = function() {
            iframe.css({
                height: wrapper.height(),           
                width:  wrapper.width(),
            })
        }
        $(window).resize(resize).trigger('resize')
        return iframe
    }
})
