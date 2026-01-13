<script setup>
import DataTable from 'datatables.net-vue3';
import DataTablesCore from 'datatables.net-dt';
import 'datatables.net-responsive-dt';

DataTable.use(DataTablesCore);

const options = {
  responsive: true,
  // select: true,
};
const data = [
    [1, 2],
    [3, 4],
];
</script>

<template>
    <DataTable :options :data class="display">
        <thead>
            <tr>
                <th>A</th>
                <th>B</th>
            </tr>
        </thead>
    </DataTable>
</template>
<style>
@import 'datatables.net-dt';
</style>
