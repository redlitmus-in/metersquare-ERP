/**
 * Site Supervisor Role Exports
 * This role initiates purchase requests and sends them to Procurement
 */

export { siteSupervisorPermissions } from './permissions';
export { default as SiteSupervisorHub } from './pages/SiteSupervisorHub';
export { siteSupervisorService } from './services/siteSupervisorService';

// Site Supervisor can create purchase requests
// Components for creating PRs would go here