import { Injectable } from '@angular/core';
import { AuthHttpInterceptor as auth0Interceptor } from '@auth0/auth0-angular';

@Injectable()
export class AuthHttpInterceptor extends auth0Interceptor {}
