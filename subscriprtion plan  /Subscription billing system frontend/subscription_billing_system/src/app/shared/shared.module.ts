import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { HttpClientModule } from '@angular/common/http';

import { SubscriptionPlansComponent } from './subscription-plans/subscription-plans.component';
import { PaymentComponent } from './payment/payment.component';

@NgModule({
  declarations: [],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    HttpClientModule,
    SubscriptionPlansComponent,
    PaymentComponent
  ],
  exports: [
    SubscriptionPlansComponent,
    PaymentComponent
  ]
})
export class SharedModule { } 