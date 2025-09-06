from flask import Blueprint, request
from controllers.file_upload_controller import *
# Create blueprint for purchase workflow routes
file_upload_routes = Blueprint('file_upload', __name__, url_prefix='/')


@file_upload_routes.route('/upload_images_GCP', methods=['POST'])
def upload_images_GCP_route():
    flag = request.args.get('key')
    room_id = request.args.get('id')
    return upload_images_GCP(key=flag, id=room_id)

@file_upload_routes.route('/download_images_GCP', methods=['GET'])
def get_uploaded_images_GCP_route():
    flag = request.args.get('key')
    room_id = request.args.get('id')
    return get_uploaded_images_GCP(key=flag, id=room_id)

@file_upload_routes.route('/all_images_delete', methods=['DELETE'])
def all_delete_image_GCP_route():
    flag = request.args.get('key')
    room_id = request.args.get('id')
    return all_delete_image_GCP(key=flag, id=room_id)

@file_upload_routes.route('/delete_image_GCP', methods=['DELETE'])
def delete_image_GCP_routes():
    image_name = request.args.get('image_name')
    flag = request.args.get('key')
    room_id = request.args.get('id')
    return delete_image_GCP(image_name=image_name,key=flag,id=room_id)