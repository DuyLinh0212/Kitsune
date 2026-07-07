import { HttpInterceptorFn } from '@angular/common/http';

const tokenStorageKey = 'kitsune.access_token';

export const authTokenInterceptor: HttpInterceptorFn = (req, next) => {
  const token = localStorage.getItem(tokenStorageKey);

  if (!token) {
    return next(req);
  }

  return next(req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }));
};
