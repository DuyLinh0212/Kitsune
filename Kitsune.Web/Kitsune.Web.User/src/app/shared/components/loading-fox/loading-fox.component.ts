import { Component, input } from '@angular/core';
import { AnimationOptions, LottieComponent } from 'ngx-lottie';

@Component({
  selector: 'app-loading-fox',
  standalone: true,
  imports: [LottieComponent],
  templateUrl: './loading-fox.component.html',
  styleUrl: './loading-fox.component.css',
})
export class LoadingFoxComponent {
  readonly message = input<string>('Đang tải...');
  readonly size = input<number>(140);

  readonly options: AnimationOptions = {
    path: '/lottie/happy-fox.json',
    loop: true,
    autoplay: true,
  };
}
