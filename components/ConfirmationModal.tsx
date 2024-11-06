import { Box, Button, Modal, Stack, Typography } from "@mui/material"
import React from "react"

type ConfirmationModalProps = {
  title: string
  content: string
  okHandler: VoidFunction
  open: boolean
  setOpen: (open: boolean) => void
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  title,
  content,
  okHandler,
  open,
  setOpen,
}) => {
  return (
    <Modal
      open={open}
      onClose={() => setOpen(false)}
      aria-labelledby="modal-modal-title"
      aria-describedby="modal-modal-description"
    >
      <Box>
        <Typography id="modal-modal-title" variant="h6" component="h2">
          {title}
        </Typography>
        <Typography id="modal-modal-description" sx={{ m: 2 }}>
          {content}
        </Typography>
        <Stack
          spacing="2"
          direction="row"
          sx={{
            justifyContent: "flex-end",
            alignItems: "center",
          }}
        >
          <Button
            variant="outlined"
            onClick={() => {
              okHandler()
              setOpen(false)
            }}
          >
            Ok
          </Button>
          <Button variant="outlined" onClick={() => setOpen(false)}>
            Cancel
          </Button>
        </Stack>
      </Box>
    </Modal>
  )
}