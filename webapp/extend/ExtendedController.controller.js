sap.ui.define([
	'sap/ui/core/mvc/ControllerExtension',
	'sap/m/MessageToast',
	'sap/ui/model/json/JSONModel',
	"sap/m/MessageBox"
], function (ControllerExtension, MessageToast, JSONModel, MessageBox) {

	return ControllerExtension.extend('com.sap.lh.dm.zcdmmtrpresampling.extend.ExtendedController', {
		override: {
			onAfterRendering: function () {
				const oTable = this.getView().byId('GridTable')

				if (oTable) {
					const oToolbar = this.getView().byId('template::ListReport::TableToolbar')
					const oButton = new sap.m.Button({
						text: 'Assign Lot',
						press: this._handleAssignLotActionPress.bind(this)
					})
					oToolbar.addContent(oButton)
				} else {
					MessageToast.show('Table not found!')
				}
			}
		},

		_handleAssignLotActionPress: function () {
			try {
				const oTable = this.getView().byId('GridTable')
				console.log(oTable.getPlugins())
				const oSelectionPlugin = oTable.getPlugins()[0] // Get selection plugin
				const aSelectedData = this._getSelectedRowsData(oSelectionPlugin, oTable)

				if (aSelectedData.length > 0) {
					this._openSelectedRowsDialog(aSelectedData)
				} else {
					MessageToast.show('Please select at least one row')
				}
			} catch (error) {
				MessageToast.show(error.message)
			}
		},

		onAssignButtonPress: function () {
			try {
				this._oAssignLotDialog.setBusy(true)

				const oLotInput = this.getView().byId('idlotNumberInput')
				const sLotNumber = oLotInput.getValue()

				if (!sLotNumber) {
					oLotInput.setValueState('Error')
					MessageToast.show('Enter a lot number')
					return
				}
				oLotInput.setValueState('None')

				const oModel = this.getView().getModel('lotModel')
				const sPath = '/LotNumberSet'
				const oPayload = {
					Lot: sLotNumber,
					DeviceLotSet: this._oDialogModel.getProperty('/Equipments')
				}
				oModel.create(sPath, oPayload, {
					success: (data, res) => {
						console.log(data, res)
						this._oDialogModel.setProperty('/Equipments', data?.DeviceLotSet?.results || [])
					},
					error: (err) => {
						const { statusCode, statusText, responseText } = err
						const { error } = JSON.parse(responseText)

						MessageBox.error(error.message.value, {
							title: `${statusCode}: ${statusText}`,
							details: error
						})
						console.error(err)
					}
				})
			} catch (err) {
				MessageBox.error(err.message)
			} finally {
				this._oAssignLotDialog.setBusy(false)
			}
		},

		onCancelButtonPress: function () {
			this.getView().byId('idlotNumberInput').setValue('')
			this._oAssignLotDialog.close()
		},

		_getSelectedRowsData: function (oGridTable, oTable) {
			const aIndices = oGridTable.getSelectedIndices()
			const aSelectedData = []
			if (aIndices.length > 0) {
				aIndices.forEach(iIndex => {
					const oRowContext = oTable.getContextByIndex(iIndex)
					const oData = oRowContext.getObject()
					aSelectedData.push(oData)
				})
			}
			return aSelectedData
		},

		_openSelectedRowsDialog: function (aSelectedData) {
			let aEquipmentData = aSelectedData.map(item => ({ Equnr: item.equnr }))
			aEquipmentData = Array.from(new Set(aEquipmentData.map(item => item.Equnr))).map(Equnr => ({ Equnr }))

			const oView = this.getView()
			// 1. Load the Fragment
			if (!this._oAssignLotDialog) {
				this._oAssignLotDialog = sap.ui.xmlfragment(oView.getId(), "com.sap.lh.dm.zcdmmtrpresampling.extend.LotAssign", this)
				oView.addDependent(this._oAssignLotDialog)
			}

			// 2. Bind Data to the Fragment
			this._oDialogModel = new JSONModel({ Equipments: aEquipmentData })
			this._oAssignLotDialog.setModel(this._oDialogModel, "dialogModel")

			// 3. Open the Dialog
			this._oAssignLotDialog.open()
		},

		statusFormatter: function (sType) {
			if (sType === 'S') {
				return 'Success'
			} else if (sType === 'W') {
				return 'Warning'
			} else if (sType === 'E') {
				return 'Error'
			} else {
				return 'None'
			}
		}
	})
})
