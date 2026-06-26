import boot from '$elpisBoot'
import projectList from './project-list.vue'
import '../dashboard/dashboard-theme.css'

document.documentElement.classList.remove('dark')
document.documentElement.classList.add('retail-light', 'retail-project-list')

boot(projectList)
