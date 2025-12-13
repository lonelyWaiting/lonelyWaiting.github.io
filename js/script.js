// 将toggleToc函数移到全局作用域
function toggleToc() {
    const tocContainer = document.querySelector('.toc-container');
    const tocToggle = document.querySelector('.toc-toggle');
    const isCollapsed = tocContainer.classList.contains('collapsed');
    
    if (isCollapsed) {
        tocContainer.classList.remove('collapsed');
        tocToggle.classList.remove('collapsed');
    } else {
        tocContainer.classList.add('collapsed');
        tocToggle.classList.add('collapsed');
    }
}

let tocHighlightLock = false;

function updateTocHighlight() {
    const tocLinks = document.querySelectorAll('.toc-content a');
    tocLinks.forEach(link => link.classList.remove('active'));

    const headings = document.querySelectorAll('.article-entry h1, .article-entry h2, .article-entry h3, .article-entry h4, .article-entry h5, .article-entry h6');
    let currentHeading = null;
    let currentTop = -Infinity;
    const threshold = 32; // 顶部阈值，可根据页面实际调整

    headings.forEach(heading => {
        const rect = heading.getBoundingClientRect();
        if (rect.top <= threshold && rect.top > currentTop) {
            currentTop = rect.top;
            currentHeading = heading;
        }
    });

    if (currentHeading) {
        const activeLink = document.querySelector('.toc-content a[href="#' + currentHeading.id + '"]');
        if (activeLink) {
            activeLink.classList.add('active');
        }
    }
}

window.addEventListener('hashchange', function() {
    setTimeout(updateTocHighlight, 10);
});
document.addEventListener('DOMContentLoaded', updateTocHighlight);
window.addEventListener('scroll', function() {
    setTimeout(updateTocHighlight, 100);
});

(function ($) {
    $('.navbar-burger').click(function () {
        $(this).toggleClass('is-active');
        $('.navbar-main .navbar-start').toggleClass('is-active');
        $('.navbar-main .navbar-end').toggleClass('is-active');
    });

    // Hide Header on on scroll down
    var didScroll;
    var lastScrollTop = 0;
    var delta = 5;
    var navbarHeight = $('.navbar-main').outerHeight();

    $(window).scroll(function(event){
        didScroll = true;
    });

    setInterval(function() {
        if (didScroll) {
            hasScrolled();
            didScroll = false;
        }
    }, 250);

    function hasScrolled() {
        var st = $(this).scrollTop();

        // Make sure they scroll more than delta
        if(Math.abs(lastScrollTop - st) <= delta) {
            return;
        }

        // If they scrolled down and are past the navbar, add class .navbar-down.
        // This is necessary so you never see what is "behind" the navbar.
        if (st > lastScrollTop && st > navbarHeight) {
            var posY = Math.min(st, navbarHeight);
            // Scroll Down
            $('.navbar-main').css({
                '-webkit-transform' : 'translateY(-' + posY + 'px)',
                '-moz-transform'    : 'translateY(-' + posY + 'px)',
                '-ms-transform'     : 'translateY(-' + posY + 'px)',
                '-o-transform'      : 'translateY(-' + posY + 'px)',
                'transform'         : 'translateY(-' + posY + 'px)'
            });
        } else {
            // Scroll Up
            if(st + $(window).height() < $(document).height()) {
                $('.navbar-main').css({
                    '-webkit-transform' : 'translateY(0px)',
                    '-moz-transform'    : 'translateY(0px)',
                    '-ms-transform'     : 'translateY(0px)',
                    '-o-transform'      : 'translateY(0px)',
                    'transform'         : 'translateY(0px)'
                });
            }
        }

        lastScrollTop = st;
    }

    $('.article.gallery img:not(".not-gallery-item")').each(function () {
        // wrap images with link and add caption if possible
        if ($(this).parent('a').length === 0) {
            $(this).wrap('<a class="gallery-item" href="' + $(this).attr('src') + '"></a>');
            if (this.alt) {
                $(this).after('<div class="caption">' + this.alt + '</div>');
            }
        }
    });

    // 检测纯图片段落，添加并列布局类
    $('.article-entry p').each(function() {
        var $p = $(this);
        var children = $p.contents().filter(function() {
            // 过滤掉纯空白文本节点
            return !(this.nodeType === 3 && !this.textContent.trim());
        });
        // 检查是否所有子元素都是 .gallery-item
        var allGalleryItems = children.length > 1 && children.toArray().every(function(node) {
            return $(node).hasClass('gallery-item');
        });
        if (allGalleryItems) {
            $p.addClass('images-row');
        }
    });

    $('.article-entry').find('h1, h2, h3, h4, h5, h6').on('click', function () {
        if ($(this).get(0).id) {
            window.location.hash = $(this).get(0).id;
        }
    });

    if (typeof(moment) === 'function') {
        $('.article-meta time').each(function () {
            $(this).text(moment($(this).attr('datetime')).fromNow());
        });
    }

    const sectionDiv = $('.section')[0];
    const resizeObserver = new ResizeObserver(entries => {
        for (let entry of entries) {
            if (entry.target === sectionDiv) {
                const contentDiv = $('.article.content.gallery');
                const contentWidth = parseInt($(contentDiv).css('width'));
                const leftPadding  = parseInt($(sectionDiv).css('padding-left'));

                const tocPadding = 24;
                var maxToWidth = (sectionDiv.offsetWidth - contentWidth) / 2 - leftPadding - tocPadding;
                if (maxToWidth < 0) maxToWidth = 0;
                
                $('.toc').css('max-width', maxToWidth + 'px');
            }
        }
    });
    resizeObserver.observe(sectionDiv);

    // 添加滚动监听
    let scrollTimeout;
    $(window).on('scroll', function() {
        if (scrollTimeout) {
            clearTimeout(scrollTimeout);
        }
        scrollTimeout = setTimeout(updateTocHighlight, 100);
    });

    // 初始化时执行一次高亮更新
    updateTocHighlight();

    document.querySelectorAll('.toc-content a').forEach(link => {
        link.addEventListener('click', function() {
            setTimeout(updateTocHighlight, 10);
        });
    });

    // 移除正文图片自动添加 figure/figcaption 的功能
    // 保留原 gallery 图片加 caption 的逻辑
})(jQuery);