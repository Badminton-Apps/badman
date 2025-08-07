import { Component, Signal, computed, inject, model } from "@angular/core";
import { FormControl, FormsModule, ReactiveFormsModule } from "@angular/forms";
import { MatButtonModule } from "@angular/material/button";
import { MatDialog } from "@angular/material/dialog";
import { MatFormField, MatLabel } from "@angular/material/form-field";
import { MatInput } from "@angular/material/input";
import {
  PageHeaderComponent,
  SelectSeasonComponent,
  TriStateCheckboxComponent,
} from "@badman/frontend-components";
import { Club, ClubMembership } from "@badman/frontend-models";
import { ClubMembershipType, getSeason } from "@badman/utils";
import { MtxGrid, MtxGridColumn } from "@ng-matero/extensions/grid";
import { MtxSelect } from "@ng-matero/extensions/select";
import { TranslatePipe } from "@ngx-translate/core";
import moment from "moment";
import { UploadTransferLoanDialogComponent } from "../dialogs";
import { TransferLoanService } from "./transfer-loan.service";
import { combineLatest, debounceTime, startWith } from "rxjs";

@Component({
  selector: "badman-ranking-overview",
  templateUrl: "./overview.page.html",
  styleUrls: ["./overview.page.scss"],
  imports: [
    FormsModule,
    MatButtonModule,
    MtxGrid,
    MtxSelect,
    MatFormField,
    MatLabel,
    MatInput,
    TriStateCheckboxComponent,
    PageHeaderComponent,
    TranslatePipe,
    SelectSeasonComponent,
    ReactiveFormsModule,
  ],
})
export class OverviewPageComponent {
  // injects
  service = inject(TransferLoanService);
  dialog = inject(MatDialog);

  transfers = this.service.state.filtered;
  loaded = this.service.state.loaded;
  loading = computed(() => !this.loaded());

  // create an array starting from getSeason() and go back 5 years
  seasons = computed(() => {
    const currentYear = getSeason();
    const years = Array.from({ length: 5 }, (_, i) => currentYear - i);
    return years.reverse();
  });

  seasonControl = new FormControl<number>(getSeason()) as FormControl<number>;
  confirmedControl = new FormControl<boolean>(false) as FormControl<boolean>;
  searchControl = new FormControl<string>("") as FormControl<string>;
  newClubsControl = new FormControl<string[] | null>(null) as FormControl<string[]>;
  currentClubsControl = new FormControl<string[] | null>(null) as FormControl<string[]>;

  constructor() {
    // watch for changes in the seasonControl and update the service state
    this.seasonControl.valueChanges.subscribe((season) => {
      console.log("Season changed:", season);
      if (season) {
        this.searchControl.reset(); // reset the search control when confirmed changes
        this.service.state.setSeason(season);
      }
    });

    // watch for changes in the confirmedControl and update the service state
    this.confirmedControl.valueChanges.subscribe((confirmed) => {
      console.log("Confirmed changed:", confirmed);
      this.searchControl.reset(); // reset the search control when confirmed changes
      this.service.state.setConfirmed(confirmed);
    });

    // watch for any changes in the search, new club, currentclubs controls and update the service state
    combineLatest([
      this.searchControl.valueChanges.pipe(startWith(this.searchControl.value)),
      this.newClubsControl.valueChanges.pipe(startWith(this.newClubsControl.value)),
      this.currentClubsControl.valueChanges.pipe(startWith(this.currentClubsControl.value)),
    ])
      .pipe(debounceTime(300)) // debounce the input for 300ms
      .subscribe(([search, newClubs, currentClubs]) => {
        console.log("Search changed:", search);
        console.log("New clubs changed:", newClubs);
        console.log("Current clubs changed:", currentClubs);
        this.service.state.setFilter({
          search,
          newClubs,
          currentClubs,
        });
      });
  }

  currentClubs = computed(() => {
    const uniqueClubIds = new Set<string>(); // Using Set to store unique club IDs
    const clubs =
      this.transfers()
        ?.map((r) => r.player?.clubs?.find((r: Club) => r.clubMembership?.active))
        ?.filter((c) => !!c?.id)
        ?.filter((club) => {
          if (!club?.id) {
            throw new Error(`No club Id provided`);
          }
          if (!uniqueClubIds.has(club?.id)) {
            uniqueClubIds.add(club.id);
            return true;
          }
          return false;
        }) ?? [];

    return clubs;
  }) as Signal<Club[]>;

  newClubs = computed(() => {
    const uniqueClubIds = new Set<string>(); // Using Set to store unique club IDs
    const clubs =
      this.transfers()
        ?.map((r) => r.club)
        ?.filter((c) => !!c?.id)
        ?.filter((club) => {
          if (!club?.id) {
            throw new Error(`No club Id provided`);
          }
          if (!uniqueClubIds.has(club?.id)) {
            uniqueClubIds.add(club.id);
            return true;
          }
          return false;
        }) ?? [];

    return clubs;
  }) as Signal<Club[]>;

  columns: MtxGridColumn[] = [
    { header: "Name", field: "player.fullName", sortable: true },
    { header: "New club", field: "club.name", sortable: true },
    {
      header: "Current club",
      field: "nothing",
      formatter: (data) => data.player.clubs?.find((r: Club) => r.clubMembership?.active)?.name,
      sortable: true,
    },
    {
      header: "Membership type",
      field: "membershipType",
      formatter: (data) => {
        switch (data.membershipType) {
          case ClubMembershipType.NORMAL:
            return "Transfer";
          case ClubMembershipType.LOAN:
            return "Uitlening";
          default:
            return "Unknown";
        }
      },
      sortable: true,
    },
    {
      header: "Start",
      field: "start",
      formatter: (data) => moment(data.start).format("YYYY-MM-DD HH:mm:ss"),
      sortable: true,
    },
    {
      header: "End",
      field: "end",
      formatter: (data) => (data.end ? moment(data.end).format("YYYY-MM-DD HH:mm:ss") : "--"),
      sortable: true,
    },
    {
      header: "Operation",
      field: "operation",
      pinned: "right",
      right: "0px",
      type: "button",
      buttons: [
        {
          type: "icon",
          text: "accept",
          icon: "check",
          tooltip: "accept",
          click: (row) => this.acceptTransfer(row),
        },
        {
          type: "icon",
          text: "reject",
          icon: "close",
          tooltip: "reject",
          click: (row) => this.rejectTransfer(row),
        },
      ],
    },
  ];

  selectedRows = model([]);

  acceptAll() {
    for (const transfer of this.selectedRows()) {
      this.acceptTransfer(transfer);
    }
  }

  rejectAll() {
    for (const transfer of this.selectedRows()) {
      this.rejectTransfer(transfer);
    }
  }

  acceptTransfer(membership: ClubMembership) {
    this.service.state.updateMembership({
      id: membership.id,
      confirmed: true,
    });
  }

  rejectTransfer(membership: ClubMembership) {
    this.service.state.deleteMembership({
      id: membership.id,
    });
  }

  openUploadDialog() {
    this.dialog
      .open(UploadTransferLoanDialogComponent, {
        disableClose: true,
        data: {
          season: this.seasonControl.value,
        },
      })
      .afterClosed()
      .subscribe(() => {
        this.service.state.reload();
      });
  }
}
