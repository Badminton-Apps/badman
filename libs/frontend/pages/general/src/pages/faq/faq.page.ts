import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
  inject,
} from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { ActivatedRoute } from '@angular/router';
import { HasClaimComponent } from '@badman/frontend-components';
import { SeoService } from '@badman/frontend-seo';
import { Apollo, gql } from 'apollo-angular';
import { QuillModule } from 'ngx-quill';
import { lastValueFrom } from 'rxjs';

@Component({
  selector: 'badman-faq',
  templateUrl: './faq.page.html',
  styleUrls: ['./faq.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    MatFormFieldModule,
    HasClaimComponent,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    ReactiveFormsModule,
    FormsModule,
    MatInputModule,
    QuillModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FaqPageComponent implements OnInit {
  questions!: Question[];
  private seoService = inject(SeoService);
  private route = inject(ActivatedRoute);
  private apollo = inject(Apollo);
  private changeDetectorRef = inject(ChangeDetectorRef);
  questionBeingEdited?: string;
  editForm!: FormGroup;

  constructor() {
    const formBuilder = inject(FormBuilder);

    this.editForm = formBuilder.group({
      question: '',
      answer: '',
    });
  }

  ngOnInit() {
    this.route.data.subscribe((data) => {
      this.questions = data['faqs'];

      this.seoService.update({
        title: 'FAQ',
        description: `Faq`,
        type: 'website',
        keywords: ['FAQ', 'badminton'],
      });
    });
  }

  editQuestion(question: Question) {
    this.questionBeingEdited = question.id;
    this.editForm?.setValue({
      question: question.question,
      answer: question.answer,
    });
  }

  async saveEdit(question: Question) {
    this.questionBeingEdited = undefined;
    question.question = this.editForm?.get('question')?.value;
    question.answer = this.editForm?.get('answer')?.value;

    if (question.id !== 'new') {
      // Update question
      await lastValueFrom(
        this.apollo.mutate({
          mutation: gql`
            mutation updateFaq($data: FaqUpdateInput!) {
              updateFaq(data: $data) {
                id
                question
                answer
              }
            }
          `,
          variables: {
            data: {
              id: question.id,
              question: question.question,
              answer: question.answer,
            },
          },
        }),
      );
    } else {
      // Create question
      const result = await lastValueFrom(
        this.apollo.mutate<{ createFaq: Question }>({
          mutation: gql`
            mutation createFaq($data: FaqNewInput!) {
              createFaq(data: $data) {
                id
                question
                answer
              }
            }
          `,
          variables: {
            data: {
              question: question.question,
              answer: question.answer,
            },
          },
        }),
      );
      question.id = result.data?.createFaq.id;
    }

    const index = this.questions.findIndex((q) => q.id === question.id);
    this.questions[index] = question;
    this.editForm?.reset();
    this.changeDetectorRef.markForCheck();
  }

  cancelEdit() {
    this.questionBeingEdited = undefined;
    this.editForm?.reset();
    if (this.questions[this.questions.length - 1].id === 'new') {
      this.questions.pop();
    }
  }

  addQuestion() {
    this.questions.push({
      id: 'new',
      question: '',
      answer: '',
    });
    this.editQuestion(this.questions[this.questions.length - 1]);
  }

  async deleteQuestion(question: Question) {
    if (question.id === 'new') {
      this.questions = this.questions.filter((q) => q.id !== question.id);
    } else {
      await lastValueFrom(
        this.apollo.mutate({
          mutation: gql`
            mutation deleteFaq($id: ID!) {
              deleteFaq(id: $id)
            }
          `,
          variables: {
            id: question.id,
          },
        }),
      );

      this.questions = this.questions.filter((q) => q.id !== question.id);
    }
    this.changeDetectorRef.markForCheck();
  }
}

export interface Question {
  id?: string;
  question: string;
  answer: string;
}
