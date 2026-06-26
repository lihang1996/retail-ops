import boot from '$elpisBoot'
import login from './login.vue'
import '../dashboard/dashboard-theme.css'

document.documentElement.classList.remove('dark')
document.documentElement.classList.add('retail-light', 'retail-login')

boot(login)
