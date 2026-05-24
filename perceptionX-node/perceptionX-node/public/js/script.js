let icon = document.querySelector('.scroll-icon');
if (icon) {
    window.addEventListener('scroll', function () {
        if (window.scrollY > 0) {
            icon.classList.add('hidden');
        }
    });
}

const body = document.body;
let toggle = document.querySelectorAll('.light-theme')
let toggleShadow = document.querySelectorAll('.light-theme-shadow')
let heading = document.querySelector('.light-theme-h1');
let buttons = document.querySelectorAll('.button-light');



let themeToggle = document.getElementById('theme');

if (themeToggle) {
    document.addEventListener("DOMContentLoaded",function(){
        themeToggle.checked = false;
        themeToggle.dispatchEvent(new Event('change'));
    })

    themeToggle.addEventListener('change', function() {

    if (!(themeToggle.checked)) {
        body.classList.add('light-theme')
        body.classList.remove('dark-theme')
        toggle.forEach(togg =>{
            togg.classList.add('light-theme')
            togg.classList.remove('dark-theme')
            });
        body.classList.add('light-theme-shadow')
        body.classList.remove('dark-theme-shadow')
        toggleShadow.forEach(togg =>{
            togg.classList.add('light-theme-shadow')
            togg.classList.remove('dark-theme-shadow')
            });
        if (heading) {
            heading.classList.add('light-theme-h1')
            heading.classList.remove('dark-theme-h1')
        }
        buttons.forEach(button =>{
            button.classList.add('button-light')
            button.classList.remove('button-dark')
        });
        
    } else {
        body.classList.add('dark-theme')
        body.classList.remove('light-theme')
        toggle.forEach(togg =>{
            togg.classList.add('dark-theme')
            togg.classList.remove('light-theme')
        });
        body.classList.add('dark-theme-shadow')
        body.classList.remove('light-theme-shadow')
        toggleShadow.forEach(togg =>{
            togg.classList.add('dark-theme-shadow')
            togg.classList.remove('light-theme-shadow')
        });
        if (heading) {
            heading.classList.add('dark-theme-h1')
            heading.classList.remove('light-theme-h1')
        }
        buttons.forEach(button =>{
            button.classList.add('button-dark')
            button.classList.remove('button-light')
        });
    }
});
}