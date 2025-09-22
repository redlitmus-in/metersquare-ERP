/**
 * MEP Supervisor Role Exports
 * This role handles Mechanical, Electrical, and Plumbing related purchase requests and workflows
 */

export { mepSupervisorPermissions } from './permissions';
export { default as MEPSupervisorHub } from './pages/MEPSupervisorHub';
export { mepSupervisorService } from './services/mepSupervisorService';

// MEP Supervisor can create MEP-specific purchase requests
// Components for MEP equipment and material requests would go here