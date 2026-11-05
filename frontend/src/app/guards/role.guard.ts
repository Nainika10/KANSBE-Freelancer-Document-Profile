import { inject } from '@angular/core';
import { CanActivateFn, ActivatedRouteSnapshot, Router } from '@angular/router';

export const roleGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const router = inject(Router);

  const token = sessionStorage.getItem('Token');
  const role = sessionStorage.getItem('adminRole')?.trim().toLowerCase();
  const allowedRoles = route.data?.['expectedRole'] as string[];

  (window as any).appLogger?.info('Token:', token);
  (window as any).appLogger?.info('Role:', role);
  (window as any).appLogger?.info('Allowed Roles:', allowedRoles);

  if (!token) {
    (window as any).appLogger?.warn('No token - redirecting');
    router.navigate(['/alphalogin']);
    return false;
  }

  if (allowedRoles && !allowedRoles.includes(role!)) {
    (window as any).appLogger?.warn('Role not allowed - redirecting');
    router.navigate(['/alphalogin']);
    return false;
  }

  (window as any).appLogger?.info('Access granted');
  return true;
};