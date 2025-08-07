import { CommonModule } from "@angular/common";
import { Component, computed, inject } from "@angular/core";
import { MatButtonModule } from "@angular/material/button";
import { MatDialogModule } from "@angular/material/dialog";
import { MatIconModule } from "@angular/material/icon";
import { MatProgressBarModule } from "@angular/material/progress-bar";
import { MatTableModule } from "@angular/material/table";
import { MatTooltipModule } from "@angular/material/tooltip";
import { RouterModule } from "@angular/router";
import { TranslatePipe } from "@ngx-translate/core";
import { CanPlay, ClubAssemblyService } from "./club-assembly.service";

@Component({
  selector: "badman-club-assembly",
  imports: [
    CommonModule,
    RouterModule,
    TranslatePipe,
    MatIconModule,
    MatButtonModule,
    MatDialogModule,
    MatTableModule,
    MatTooltipModule,
    MatProgressBarModule,
  ],
  templateUrl: "./club-assembly.component.html",
  styleUrls: ["./club-assembly.component.scss"],
})
export class ClubAssemblyComponent {
  clubAssemblyService = inject(ClubAssemblyService);

  columns = computed(() => [
    "player",
    ...(this.clubAssemblyService.state.teams()?.map((team) => team.name ?? "empty") ?? []),
  ]);

  canPlay = CanPlay;
}
