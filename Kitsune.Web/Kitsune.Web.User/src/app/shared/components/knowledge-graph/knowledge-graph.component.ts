import { CommonModule } from '@angular/common';
import { Component, input } from '@angular/core';
import { LearningKnowledgeGraph } from '../../../core/services/learning-knowledge.service';

@Component({
  selector: 'app-knowledge-graph',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="knowledge-card">
      <header>
        <div><span>Knowledge Graph</span><h2>{{ graph().title }}</h2><p>{{ graph().subtitle }}</p></div>
        <div class="overall"><strong>{{ graph().overallScore }}%</strong><small>tổng thể</small></div>
      </header>
      @if (graph().nodes.length === 0) {
        <div class="empty"><b>Chưa đủ dữ liệu</b><span>Hoàn thành vài câu ôn tập hoặc một đề kiểm tra để mở bản đồ năng lực.</span></div>
      } @else {
        <div class="map">
          <div class="hub"><span>あなた</span><strong>{{ graph().overallScore }}%</strong></div>
          <div class="nodes">
            @for (node of graph().nodes; track node.id) {
              <article [class]="'node node--' + node.status">
                <div><span>{{ node.label }}</span><strong>{{ node.score }}%</strong></div>
                <meter min="0" max="100" [value]="node.score">{{ node.score }}%</meter>
                <p>{{ node.insight }}</p><small>{{ node.correct }}/{{ node.attempts }} câu đúng</small>
              </article>
            }
          </div>
        </div>
      }
      <footer><i class="legend-strong"></i>Mạnh <i class="legend-growing"></i>Đang phát triển <i class="legend-weak"></i>Cần ưu tiên <i class="legend-learning"></i>Chưa đủ dữ liệu</footer>
    </section>
  `,
  styles: [`
    :host{display:block}.knowledge-card{padding:22px;border:1px solid #eadcc8;border-radius:20px;background:#fffdf8;box-shadow:0 10px 28px rgba(92,58,30,.08);color:#30241e}.knowledge-card>header{display:flex;justify-content:space-between;gap:20px;align-items:start}.knowledge-card header span{color:#a84722;font-size:.68rem;font-weight:900;letter-spacing:.13em;text-transform:uppercase}.knowledge-card h2{margin:4px 0;font-size:1.35rem}.knowledge-card header p{margin:0;color:#765f50;font-size:.86rem}.overall{display:grid;place-items:center;width:76px;height:76px;flex:0 0 76px;border:6px solid #f0c684;border-radius:50%;background:#fff8e9}.overall strong{font-size:1.35rem}.overall small{margin-top:-9px;color:#765f50}.map{position:relative;margin-top:20px;padding-left:132px}.hub{position:absolute;top:50%;left:10px;display:grid;place-items:center;width:96px;height:96px;border-radius:50%;color:#fff;background:#9c4227;box-shadow:0 0 0 10px #f8e5c8;transform:translateY(-50%)}.hub span{font-size:.67rem}.hub strong{font-size:1.45rem}.nodes{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.node{position:relative;padding:13px 14px;border:1px solid #ddd;border-left:5px solid;border-radius:13px;background:#fff}.node::before{content:'';position:absolute;top:50%;right:100%;width:20px;border-top:1px dashed #c9b89f}.node>div{display:flex;justify-content:space-between;gap:10px}.node span,.node strong{font-weight:800}.node meter{width:100%;height:9px;margin:7px 0}.node p{margin:0;color:#665d59;font-size:.76rem;line-height:1.35}.node small{color:#93847b;font-size:.69rem}.node--strong{border-left-color:#2fa568}.node--growing{border-left-color:#e59b18}.node--weak{border-left-color:#d8493f}.node--learning{border-left-color:#8b7fa2}.empty{display:grid;gap:5px;margin-top:18px;padding:24px;border:1px dashed #d8c6ab;border-radius:14px;text-align:center;color:#765f50}.knowledge-card footer{display:flex;flex-wrap:wrap;gap:7px;align-items:center;margin-top:14px;color:#7c6d65;font-size:.69rem}.knowledge-card footer i{width:8px;height:8px;margin-left:5px;border-radius:50%;background:#888}.legend-strong{background:#2fa568!important}.legend-growing{background:#e59b18!important}.legend-weak{background:#d8493f!important}.legend-learning{background:#8b7fa2!important}@media(max-width:680px){.knowledge-card{padding:16px}.map{padding:0}.hub{position:static;margin:0 auto 16px;transform:none}.nodes{grid-template-columns:1fr}.node::before{display:none}}
  `],
})
export class KnowledgeGraphComponent {
  readonly graph = input.required<LearningKnowledgeGraph>();
}
